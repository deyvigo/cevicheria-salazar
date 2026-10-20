package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.admin.dto.AdminCategoryResponse;
import com.salazar.api.admin.dto.CategoryRequest;
import com.salazar.api.catalogo.Category;
import com.salazar.api.catalogo.CategoryRepository;
import com.salazar.api.catalogo.ProductRepository;
import com.salazar.api.common.exception.CategoryInUseException;
import com.salazar.api.common.exception.CategoryNotFoundException;
import com.salazar.api.common.exception.FieldConflictException;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class AdminCategoryServiceTest {
    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    private AdminCategoryService service() {
        return new AdminCategoryService(categoryRepository, productRepository);
    }

    @Test
    void requestStripsTheNameAndLowercasesTheSlug() {
        CategoryRequest request = new CategoryRequest("  Postres  ", " Postres-Fríos ");

        assertThat(request.name()).isEqualTo("Postres");
        assertThat(request.slug()).isEqualTo("postres-fríos");
    }

    @Test
    void createsACategory() {
        AdminCategoryResponse response = service().create(new CategoryRequest("Postres", "postres"));

        assertThat(response.name()).isEqualTo("Postres");
        assertThat(response.slug()).isEqualTo("postres");
        assertThat(response.productCount()).isZero();
        verify(categoryRepository).saveAndFlush(any(Category.class));
    }

    @Test
    void createRejectsATakenNameBeforeTheSlug() {
        when(categoryRepository.existsByNameIgnoreCase("Postres")).thenReturn(true);

        assertThatThrownBy(() -> service().create(new CategoryRequest("Postres", "postres")))
                .isInstanceOfSatisfying(FieldConflictException.class, ex -> assertThat(ex.getField()).isEqualTo("name"));
        verify(categoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void createRejectsATakenSlug() {
        when(categoryRepository.existsBySlug("postres")).thenReturn(true);

        assertThatThrownBy(() -> service().create(new CategoryRequest("Postres", "postres")))
                .isInstanceOfSatisfying(FieldConflictException.class, ex -> assertThat(ex.getField()).isEqualTo("slug"));
    }

    @Test
    void aRaceOnTheNameConstraintBecomesANameConflict() {
        when(categoryRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("x", new RuntimeException("violates uq_categories_name_lower")));

        assertThatThrownBy(() -> service().create(new CategoryRequest("Postres", "postres")))
                .isInstanceOfSatisfying(FieldConflictException.class, ex -> assertThat(ex.getField()).isEqualTo("name"));
    }

    @Test
    void aRaceOnTheSlugConstraintBecomesASlugConflict() {
        when(categoryRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("x", new RuntimeException("violates categories_slug_key")));

        assertThatThrownBy(() -> service().create(new CategoryRequest("Postres", "postres")))
                .isInstanceOfSatisfying(FieldConflictException.class, ex -> assertThat(ex.getField()).isEqualTo("slug"));
    }

    @Test
    void updateExcludesTheCategoryItselfFromTheAvailabilityCheck() {
        Category category = new Category("Ceviches", "ceviches");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.countByCategoryId(1L)).thenReturn(3L);

        AdminCategoryResponse response = service().update(1L, new CategoryRequest("Ceviches", "ceviches-frescos"));

        assertThat(category.getName()).isEqualTo("Ceviches");
        assertThat(category.getSlug()).isEqualTo("ceviches-frescos");
        assertThat(response.productCount()).isEqualTo(3);
        verify(categoryRepository).existsByNameIgnoreCaseAndIdNot("Ceviches", 1L);
        verify(categoryRepository).existsBySlugAndIdNot("ceviches-frescos", 1L);
    }

    @Test
    void updateOfAMissingCategoryIsNotFound() {
        when(categoryRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().update(9L, new CategoryRequest("A", "a")))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void deleteRemovesAnEmptyCategory() {
        Category category = new Category("Postres", "postres");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        service().delete(1L);

        verify(categoryRepository).delete(category);
    }

    @Test
    void deleteIsRejectedWhenTheCategoryHasProducts() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(new Category("Postres", "postres")));
        when(productRepository.existsByCategoryId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service().delete(1L)).isInstanceOf(CategoryInUseException.class);
        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void aForeignKeyViolationOnDeleteBecomesCategoryInUse() {
        Category category = new Category("Postres", "postres");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        org.mockito.Mockito.doThrow(new DataIntegrityViolationException("fk")).when(categoryRepository).flush();

        assertThatThrownBy(() -> service().delete(1L)).isInstanceOf(CategoryInUseException.class);
    }

    @Test
    void deleteOfAMissingCategoryIsNotFound() {
        when(categoryRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().delete(9L)).isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void searchLowercasesTrimsAndEscapesWildcards() {
        when(categoryRepository.searchWithProductCount(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service().list("  CeVi_%!  ", 1);

        verify(categoryRepository).searchWithProductCount(org.mockito.ArgumentMatchers.eq("%cevi!_!%!!%"), any(Pageable.class));
    }

    @Test
    void aBlankSearchListsEverything() {
        when(categoryRepository.findAllWithProductCount(any(Pageable.class))).thenReturn(Page.empty());

        service().list("   ", 1);

        verify(categoryRepository).findAllWithProductCount(any(Pageable.class));
        verify(categoryRepository, never()).searchWithProductCount(any(), any(Pageable.class));
    }
}
