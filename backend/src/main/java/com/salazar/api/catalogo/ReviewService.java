package com.salazar.api.catalogo;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.catalogo.dto.MyReviewResponse;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.catalogo.dto.ReviewRequest;
import com.salazar.api.catalogo.dto.ReviewResponse;
import com.salazar.api.common.exception.ProductNotFoundException;
import com.salazar.api.common.exception.ReviewNotAllowedException;
import com.salazar.api.common.exception.ReviewNotFoundException;
import com.salazar.api.pedidos.OrderRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {
    static final int PAGE_SIZE = 10;

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> list(Long productId, int page, ReviewFilter filter) {
        requireVisibleProduct(productId);
        int requested = Math.max(page, 1);
        Page<ReviewResponse> result = reviewRepository.findPage(
                productId, filter.minRating(), filter.maxRating(), PageRequest.of(requested - 1, PAGE_SIZE));
        return new PageResponse<>(
                result.getContent(), requested, PAGE_SIZE, result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public MyReviewResponse mine(Long userId, Long productId) {
        User customer = requireCustomer(userId);
        requireVisibleProduct(productId);
        ReviewResponse review = reviewRepository
                .findByProductIdAndUserId(productId, userId)
                .map(found -> ReviewResponse.from(found, customer.getFirstName()))
                .orElse(null);
        return new MyReviewResponse(review != null || hasReceived(userId, productId), review);
    }

    @Transactional
    public ReviewResponse save(Long userId, Long productId, ReviewRequest request) {
        User customer = requireCustomer(userId);
        // The product row lock serializes concurrent writes so the average never goes stale
        Product product = productRepository
                .findByIdForUpdate(productId)
                .filter(found -> found.isActive() && found.getDeletedAt() == null)
                .orElseThrow(ProductNotFoundException::new);
        if (!hasReceived(userId, productId)) {
            throw new ReviewNotAllowedException();
        }
        String comment = normalize(request.comment());
        Review review = reviewRepository.findByProductIdAndUserId(productId, userId).orElse(null);
        if (review == null) {
            review = new Review(productId, userId, request.rating(), comment);
        } else {
            review.edit(request.rating(), comment);
        }
        try {
            review = reviewRepository.saveAndFlush(review);
        } catch (DataIntegrityViolationException ex) {
            throw new ReviewNotAllowedException();
        }
        refreshRating(product);
        return ReviewResponse.from(review, customer.getFirstName());
    }

    @Transactional
    public void delete(Long userId, Long productId) {
        requireCustomer(userId);
        Product product = productRepository
                .findByIdForUpdate(productId)
                .filter(found -> found.isActive() && found.getDeletedAt() == null)
                .orElseThrow(ProductNotFoundException::new);
        Review review = reviewRepository.findByProductIdAndUserId(productId, userId).orElseThrow(ReviewNotFoundException::new);
        reviewRepository.delete(review);
        reviewRepository.flush();
        refreshRating(product);
    }

    private void refreshRating(Product product) {
        Double average = reviewRepository.averageRating(product.getId());
        product.setRating(average == null ? null : BigDecimal.valueOf(average).setScale(1, RoundingMode.HALF_UP));
    }

    private boolean hasReceived(Long userId, Long productId) {
        return orderRepository.hasDeliveredProduct(userId, productId);
    }

    private void requireVisibleProduct(Long productId) {
        productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(productId).orElseThrow(ProductNotFoundException::new);
    }

    private User requireCustomer(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !user.isActive()) {
            throw new InsufficientAuthenticationException("Usuario no encontrado.");
        }
        if (user.getRole() != UserRole.CLIENTE) {
            throw new AccessDeniedException("Solo los clientes reseñan platos.");
        }
        return user;
    }

    private static String normalize(String comment) {
        if (comment == null) {
            return null;
        }
        String trimmed = comment.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
