package com.salazar.api.admin;

import com.salazar.api.admin.dto.AdminCategoryResponse;
import com.salazar.api.admin.dto.CategoryRequest;
import com.salazar.api.catalogo.Category;
import com.salazar.api.catalogo.CategoryRepository;
import com.salazar.api.catalogo.ProductRepository;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.common.exception.CategoryInUseException;
import com.salazar.api.common.exception.CategoryNotFoundException;
import com.salazar.api.common.exception.FieldConflictException;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminCategoryService {
    static final int PAGE_SIZE = 20;
    private static final int MAX_QUERY_LENGTH = 100;
    private static final String NAME_TAKEN = "Ya existe una categoría con ese nombre.";
    private static final String SLUG_TAKEN = "Ya existe una categoría con ese enlace.";

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public PageResponse<AdminCategoryResponse> list(String query, int page) {
        String pattern = searchPattern(query);
        int requested = Math.max(page, 1);
        Page<AdminCategoryResponse> result = find(pattern, requested);
        if (result.isEmpty() && requested > 1 && result.getTotalPages() > 0) {
            requested = result.getTotalPages();
            result = find(pattern, requested);
        }
        return new PageResponse<>(
                result.getContent(), requested, PAGE_SIZE, result.getTotalElements(), result.getTotalPages());
    }

    private Page<AdminCategoryResponse> find(String pattern, int page) {
        PageRequest pageRequest = PageRequest.of(page - 1, PAGE_SIZE);
        return pattern == null
                ? categoryRepository.findAllWithProductCount(pageRequest)
                : categoryRepository.searchWithProductCount(pattern, pageRequest);
    }

    /** Returns a case-insensitive LIKE pattern, or null when there is nothing to search for. */
    private static String searchPattern(String raw) {
        if (raw == null) return null;
        String term = raw.strip();
        if (term.isEmpty()) return null;
        if (term.length() > MAX_QUERY_LENGTH) term = term.substring(0, MAX_QUERY_LENGTH).strip();
        // The user's wildcards are literal text: only the surrounding % are ours ("!" is the LIKE escape character)
        String escaped = term.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return "%" + escaped + "%";
    }

    @Transactional
    public AdminCategoryResponse create(CategoryRequest request) {
        checkAvailable(request, null);
        Category category = new Category(request.name(), request.slug());
        save(category);
        return AdminCategoryResponse.from(category, 0);
    }

    @Transactional
    public AdminCategoryResponse update(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id).orElseThrow(CategoryNotFoundException::new);
        checkAvailable(request, id);
        category.update(request.name(), request.slug());
        save(category);
        return AdminCategoryResponse.from(category, productRepository.countByCategoryId(id));
    }

    @Transactional
    public void delete(Long id) {
        Category category = categoryRepository.findById(id).orElseThrow(CategoryNotFoundException::new);
        if (productRepository.existsByCategoryId(id)) {
            throw new CategoryInUseException();
        }
        try {
            categoryRepository.delete(category);
            categoryRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            // A dish was assigned between the check and the delete; the foreign key is the last line of defense
            throw new CategoryInUseException();
        }
    }

    private void checkAvailable(CategoryRequest request, Long excludeId) {
        boolean nameTaken = excludeId == null
                ? categoryRepository.existsByNameIgnoreCase(request.name())
                : categoryRepository.existsByNameIgnoreCaseAndIdNot(request.name(), excludeId);
        if (nameTaken) throw new FieldConflictException("name", NAME_TAKEN);
        boolean slugTaken = excludeId == null
                ? categoryRepository.existsBySlug(request.slug())
                : categoryRepository.existsBySlugAndIdNot(request.slug(), excludeId);
        if (slugTaken) throw new FieldConflictException("slug", SLUG_TAKEN);
    }

    private void save(Category category) {
        try {
            categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException ex) {
            // Two requests passed the availability check at once; the unique constraints decide
            String message = String.valueOf(ex.getMostSpecificCause().getMessage());
            if (message.contains("uq_categories_name_lower")) throw new FieldConflictException("name", NAME_TAKEN);
            throw new FieldConflictException("slug", SLUG_TAKEN);
        }
    }
}
