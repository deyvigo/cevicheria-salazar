package com.salazar.api.catalogo;

import com.salazar.api.catalogo.dto.MyReviewResponse;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.catalogo.dto.ReviewRequest;
import com.salazar.api.catalogo.dto.ReviewResponse;
import com.salazar.api.perfil.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
@RequiredArgsConstructor
public class ReviewController {
    private final ReviewService reviewService;

    @GetMapping
    public PageResponse<ReviewResponse> list(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(required = false) String filter) {
        return reviewService.list(productId, page, ReviewFilter.from(filter));
    }

    @GetMapping("/mine")
    public MyReviewResponse mine(Authentication authentication, @PathVariable Long productId) {
        return reviewService.mine(AuthenticatedUser.id(authentication), productId);
    }

    @PutMapping("/mine")
    public ReviewResponse save(
            Authentication authentication, @PathVariable Long productId, @Valid @RequestBody ReviewRequest request) {
        return reviewService.save(AuthenticatedUser.id(authentication), productId, request);
    }

    @DeleteMapping("/mine")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long productId) {
        reviewService.delete(AuthenticatedUser.id(authentication), productId);
    }
}
