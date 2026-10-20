package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.admin.dto.AdminProductResponse;
import com.salazar.api.admin.dto.ProductRequest;
import com.salazar.api.admin.dto.ProductRequest.ImageEntry;
import com.salazar.api.catalogo.Category;
import com.salazar.api.catalogo.CategoryRepository;
import com.salazar.api.catalogo.ImageStorage;
import com.salazar.api.catalogo.ImageType;
import com.salazar.api.catalogo.ImageUrlResolver;
import com.salazar.api.catalogo.Product;
import com.salazar.api.catalogo.ProductImage;
import com.salazar.api.catalogo.ProductRepository;
import com.salazar.api.common.config.StorageProperties;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.ProductNotFoundException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class AdminProductServiceTest {
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3};

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ImageStorage imageStorage;

    private final Category category = new Category("Ceviches", "ceviches");

    @BeforeEach
    void startTransactionSynchronization() {
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void clearTransactionSynchronization() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    private AdminProductService service() {
        ImageUrlResolver resolver = new ImageUrlResolver(new StorageProperties(null, null, null, null, null, "http://media"));
        return new AdminProductService(productRepository, categoryRepository, imageStorage, resolver);
    }

    private void finishTransaction(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(status));
    }

    private Product productWithImages(String... paths) {
        Product product = new Product("Ceviche", "Fresco", new BigDecimal("32.00"), category, null, 5);
        for (int i = 0; i < paths.length; i++) {
            product.addImage(paths[i], i);
            ReflectionTestUtils.setField(product.getImages().get(i), "id", 10L + i);
        }
        return product;
    }

    private ProductRequest request(ImageEntry... images) {
        return new ProductRequest(
                "  Ceviche mixto  ", " Con camote ", new BigDecimal("35.00"), 1L, 8, true, false, List.of(images));
    }

    private MockMultipartFile file(byte[] content) {
        return new MockMultipartFile("files", "foto.jpg", "image/jpeg", content);
    }

    @Test
    void requestStripsTheNameAndDescription() {
        ProductRequest request = request(new ImageEntry(null, 0));

        assertThat(request.name()).isEqualTo("Ceviche mixto");
        assertThat(request.description()).isEqualTo("Con camote");
    }

    @Test
    void createsADishWithItsImagesInOrder() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(imageStorage.upload(any(), eq(ImageType.JPEG))).thenReturn("products/a.jpg", "products/b.jpg");

        AdminProductResponse response = service().create(
                request(new ImageEntry(null, 1), new ImageEntry(null, 0)), List.of(file(JPEG), file(JPEG)));

        assertThat(response.name()).isEqualTo("Ceviche mixto");
        assertThat(response.available()).isFalse();
        assertThat(response.stock()).isEqualTo(8);
        assertThat(response.images()).extracting(AdminProductResponse.Image::url)
                .containsExactly("http://media/products/a.jpg", "http://media/products/b.jpg");
        verify(productRepository).saveAndFlush(any(Product.class));
    }

    @Test
    void createRejectsAnUnknownCategory() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().create(request(new ImageEntry(null, 0)), List.of(file(JPEG))))
                .isInstanceOfSatisfying(FieldInvalidException.class, ex -> assertThat(ex.getField()).isEqualTo("categoryId"));
        verify(imageStorage, never()).upload(any(), any());
    }

    @Test
    void rejectsAFileThatIsNotAnImageEvenIfNamedLikeOne() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> service().create(
                        request(new ImageEntry(null, 0)), List.of(file("<script>".getBytes()))))
                .isInstanceOfSatisfying(FieldInvalidException.class, ex -> assertThat(ex.getField()).isEqualTo("images"));
        verify(imageStorage, never()).upload(any(), any());
    }

    @Test
    void rejectsAnImageOverFiveMegabytes() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        byte[] big = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(JPEG, 0, big, 0, JPEG.length);

        assertThatThrownBy(() -> service().create(request(new ImageEntry(null, 0)), List.of(file(big))))
                .isInstanceOf(FieldInvalidException.class);
    }

    @Test
    void rejectsEntriesThatDoNotMatchTheReceivedFiles() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        // File index out of range, a file left unused and an entry with both id and file
        assertThatThrownBy(() -> service().create(request(new ImageEntry(null, 1)), List.of(file(JPEG))))
                .isInstanceOf(FieldInvalidException.class);
        assertThatThrownBy(() -> service().create(
                        request(new ImageEntry(null, 0)), List.of(file(JPEG), file(JPEG))))
                .isInstanceOf(FieldInvalidException.class);
        assertThatThrownBy(() -> service().create(request(new ImageEntry(1L, 0)), List.of(file(JPEG))))
                .isInstanceOf(FieldInvalidException.class);
    }

    @Test
    void reordersAndRemovesImagesAndDeletesTheRemovedOnesOnlyAfterCommit() {
        Product product = productWithImages("products/a.jpg", "products/b.jpg", "products/c.jpg");
        when(productRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        AdminProductResponse response =
                service().update(5L, request(new ImageEntry(12L, null), new ImageEntry(10L, null)), null);

        assertThat(response.images()).extracting(AdminProductResponse.Image::id).containsExactlyInAnyOrder(10L, 12L);
        assertThat(product.getImages()).extracting(ProductImage::getPath)
                .containsExactlyInAnyOrder("products/a.jpg", "products/c.jpg");
        assertThat(product.getImages().stream().filter(i -> i.getId() == 12L).findFirst().orElseThrow().getPosition())
                .isZero();
        assertThat(product.getImages().stream().filter(i -> i.getId() == 10L).findFirst().orElseThrow().getPosition())
                .isEqualTo(1);
        verify(imageStorage, never()).deleteQuietly(any());

        finishTransaction(TransactionSynchronization.STATUS_COMMITTED);

        verify(imageStorage).deleteQuietly("products/b.jpg");
    }

    @Test
    void keepsTheRemovedImagesWhenTheTransactionRollsBack() {
        Product product = productWithImages("products/a.jpg", "products/b.jpg");
        when(productRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        service().update(5L, request(new ImageEntry(10L, null)), null);
        finishTransaction(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(imageStorage, never()).deleteQuietly(any());
    }

    @Test
    void removesAlreadyUploadedFilesWhenALaterUploadFails() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(imageStorage.upload(any(), any())).thenReturn("products/a.jpg").thenThrow(new IllegalStateException("down"));

        assertThatThrownBy(() -> service().create(
                        request(new ImageEntry(null, 0), new ImageEntry(null, 1)), List.of(file(JPEG), file(JPEG))))
                .isInstanceOf(IllegalStateException.class);
        finishTransaction(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(imageStorage).deleteQuietly("products/a.jpg");
        verify(productRepository, never()).saveAndFlush(any());
    }

    @Test
    void removesNewUploadsWhenTheCommitFails() {
        Product product = productWithImages("products/a.jpg");
        when(productRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(imageStorage.upload(any(), any())).thenReturn("products/new.jpg");

        service().update(5L, request(new ImageEntry(10L, null), new ImageEntry(null, 0)), List.of(file(JPEG)));
        finishTransaction(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(imageStorage).deleteQuietly("products/new.jpg");
    }

    @Test
    void rejectsAnImageThatBelongsToAnotherDishOrIsRepeated() {
        Product product = productWithImages("products/a.jpg");
        when(productRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> service().update(5L, request(new ImageEntry(99L, null)), null))
                .isInstanceOf(FieldInvalidException.class);
        assertThatThrownBy(() -> service().update(
                        5L, request(new ImageEntry(10L, null), new ImageEntry(10L, null)), null))
                .isInstanceOf(FieldInvalidException.class);
    }

    @Test
    void editingOrDeletingAMissingOrDeletedDishIsNotFound() {
        when(productRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().update(5L, request(new ImageEntry(10L, null)), null))
                .isInstanceOf(ProductNotFoundException.class);
        assertThatThrownBy(() -> service().delete(5L)).isInstanceOf(ProductNotFoundException.class);
        assertThatThrownBy(() -> service().get(5L)).isInstanceOf(ProductNotFoundException.class);
    }

    @Test
    void deleteMarksTheDishAsDeletedWithoutTouchingItsImages() {
        Product product = productWithImages("products/a.jpg");
        when(productRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(product));

        service().delete(5L);

        assertThat(ReflectionTestUtils.getField(product, "deletedAt")).isNotNull();
        assertThat(product.getImages()).hasSize(1);
        verify(productRepository, never()).delete(any(Product.class));
        verify(imageStorage, never()).deleteQuietly(any());
    }
}
