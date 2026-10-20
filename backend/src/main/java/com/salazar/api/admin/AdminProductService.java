package com.salazar.api.admin;

import com.salazar.api.admin.dto.AdminProductResponse;
import com.salazar.api.admin.dto.ProductRequest;
import com.salazar.api.catalogo.Category;
import com.salazar.api.catalogo.CategoryRepository;
import com.salazar.api.catalogo.ImageStorage;
import com.salazar.api.catalogo.ImageType;
import com.salazar.api.catalogo.ImageUrlResolver;
import com.salazar.api.catalogo.NamePattern;
import com.salazar.api.catalogo.Product;
import com.salazar.api.catalogo.ProductImage;
import com.salazar.api.catalogo.ProductRepository;
import com.salazar.api.catalogo.ProductSpecifications;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.ProductNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AdminProductService {
    static final int PAGE_SIZE = 15;
    static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final String INVALID_IMAGE = "Solo JPG, PNG o WebP de hasta 5 MB.";

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ImageStorage imageStorage;
    private final ImageUrlResolver imageUrlResolver;

    @Transactional(readOnly = true)
    public PageResponse<AdminProductResponse> list(String query, String sortField, String direction, int page) {
        String pattern = NamePattern.from(query);
        Sort sort = AdminProductSort.from(sortField).toSort(direction);
        int requested = Math.max(page, 1);
        Page<Product> result = find(pattern, sort, requested);
        if (result.isEmpty() && requested > 1 && result.getTotalPages() > 0) {
            requested = result.getTotalPages();
            result = find(pattern, sort, requested);
        }
        List<AdminProductResponse> items =
                result.getContent().stream().map(this::toResponse).toList();
        return new PageResponse<>(items, requested, PAGE_SIZE, result.getTotalElements(), result.getTotalPages());
    }

    private Page<Product> find(String pattern, Sort sort, int page) {
        Specification<Product> filter = ProductSpecifications.notDeleted().and(ProductSpecifications.fetchingCategory());
        if (pattern != null) filter = filter.and(ProductSpecifications.nameMatches(pattern));
        return productRepository.findAll(filter, PageRequest.of(page - 1, PAGE_SIZE, sort));
    }

    @Transactional(readOnly = true)
    public AdminProductResponse get(Long id) {
        return toResponse(productRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(ProductNotFoundException::new));
    }

    @Transactional
    public AdminProductResponse create(ProductRequest request, List<MultipartFile> files) {
        Category category = findCategory(request.categoryId());
        List<UploadedFile> uploads = validateFiles(files);
        List<Slot> slots = resolveSlots(request, uploads, Map.of());

        StorageCleanup cleanup = StorageCleanup.register(imageStorage);
        Product product = new Product(
                request.name(), request.description(), request.price(), category, null, request.stock());
        product.update(
                request.name(),
                request.description(),
                request.price(),
                category,
                request.stock(),
                request.active(),
                request.available());
        for (int position = 0; position < slots.size(); position++) {
            product.addImage(upload(slots.get(position), cleanup), position);
        }
        productRepository.saveAndFlush(product);
        return toResponse(product);
    }

    @Transactional
    public AdminProductResponse update(Long id, ProductRequest request, List<MultipartFile> files) {
        Product product = productRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(ProductNotFoundException::new);
        Category category = findCategory(request.categoryId());
        List<UploadedFile> uploads = validateFiles(files);
        Map<Long, ProductImage> existing = new HashMap<>();
        product.getImages().forEach(image -> existing.put(image.getId(), image));
        List<Slot> slots = resolveSlots(request, uploads, existing);

        StorageCleanup cleanup = StorageCleanup.register(imageStorage);
        product.update(
                request.name(),
                request.description(),
                request.price(),
                category,
                request.stock(),
                request.active(),
                request.available());

        Set<Long> kept = new HashSet<>();
        for (int position = 0; position < slots.size(); position++) {
            Slot slot = slots.get(position);
            if (slot.imageId() != null) {
                existing.get(slot.imageId()).moveTo(position);
                kept.add(slot.imageId());
            } else {
                product.addImage(upload(slot, cleanup), position);
            }
        }
        product.getImages().removeIf(image -> {
            boolean removed = image.getId() != null && !kept.contains(image.getId());
            if (removed) cleanup.deleteAfterCommit(image.getPath());
            return removed;
        });
        productRepository.saveAndFlush(product);
        return toResponse(product);
    }

    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(ProductNotFoundException::new);
        product.softDelete();
    }

    private Category findCategory(Long categoryId) {
        return categoryRepository
                .findById(categoryId)
                .orElseThrow(() -> new FieldInvalidException("categoryId", "La categoría no existe."));
    }

    private List<UploadedFile> validateFiles(List<MultipartFile> files) {
        List<UploadedFile> uploads = new ArrayList<>();
        if (files == null) return uploads;
        for (MultipartFile file : files) {
            if (file.getSize() > MAX_IMAGE_BYTES) throw new FieldInvalidException("images", INVALID_IMAGE);
            byte[] data;
            try {
                data = file.getBytes();
            } catch (IOException ex) {
                throw new FieldInvalidException("images", INVALID_IMAGE);
            }
            ImageType type = ImageType.detect(data).orElseThrow(() -> new FieldInvalidException("images", INVALID_IMAGE));
            uploads.add(new UploadedFile(data, type));
        }
        return uploads;
    }

    /** Checks that every entry points at a real image or file and every received file is used exactly once. */
    private List<Slot> resolveSlots(ProductRequest request, List<UploadedFile> uploads, Map<Long, ProductImage> existing) {
        List<Slot> slots = new ArrayList<>();
        Set<Long> usedIds = new HashSet<>();
        Set<Integer> usedFiles = new HashSet<>();
        for (ProductRequest.ImageEntry entry : request.images()) {
            boolean hasId = entry.id() != null;
            boolean hasFile = entry.file() != null;
            if (hasId == hasFile) throw invalidImages();
            if (hasId) {
                if (!existing.containsKey(entry.id()) || !usedIds.add(entry.id())) throw invalidImages();
                slots.add(new Slot(entry.id(), null));
            } else {
                int index = entry.file();
                if (index < 0 || index >= uploads.size() || !usedFiles.add(index)) throw invalidImages();
                slots.add(new Slot(null, uploads.get(index)));
            }
        }
        if (usedFiles.size() != uploads.size()) throw invalidImages();
        return slots;
    }

    private static FieldInvalidException invalidImages() {
        return new FieldInvalidException("images", "La lista de imágenes no es válida.");
    }

    private String upload(Slot slot, StorageCleanup cleanup) {
        String path = imageStorage.upload(slot.file().data(), slot.file().type());
        cleanup.deleteIfRolledBack(path);
        return path;
    }

    private AdminProductResponse toResponse(Product product) {
        return AdminProductResponse.from(product, imageUrlResolver::resolve);
    }

    private record UploadedFile(byte[] data, ImageType type) {}

    private record Slot(Long imageId, UploadedFile file) {}

    /**
     * Keeps storage consistent with the database: objects uploaded by a transaction that rolls back are removed,
     * and objects of images dropped from a dish are removed only once the change is committed.
     */
    static final class StorageCleanup implements TransactionSynchronization {
        private final ImageStorage storage;
        private final List<String> uploaded = new ArrayList<>();
        private final List<String> removed = new ArrayList<>();

        private StorageCleanup(ImageStorage storage) {
            this.storage = storage;
        }

        static StorageCleanup register(ImageStorage storage) {
            StorageCleanup cleanup = new StorageCleanup(storage);
            TransactionSynchronizationManager.registerSynchronization(cleanup);
            return cleanup;
        }

        void deleteIfRolledBack(String path) {
            uploaded.add(path);
        }

        void deleteAfterCommit(String path) {
            removed.add(path);
        }

        @Override
        public void afterCompletion(int status) {
            List<String> toDelete = status == STATUS_COMMITTED ? removed : uploaded;
            toDelete.forEach(storage::deleteQuietly);
        }
    }
}
