package com.salazar.api.admin;

import com.salazar.api.admin.dto.AdminProductResponse;
import com.salazar.api.admin.dto.ProductRequest;
import com.salazar.api.catalogo.dto.PageResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {
    private final AdminProductService productService;

    @GetMapping
    public PageResponse<AdminProductResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String dir,
            @RequestParam(defaultValue = "1") int page) {
        return productService.list(q, sort, dir, page);
    }

    @GetMapping("/{id}")
    public AdminProductResponse get(@PathVariable Long id) {
        return productService.get(id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductResponse create(
            @Valid @RequestPart("data") ProductRequest data,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return productService.create(data, files);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AdminProductResponse update(
            @PathVariable Long id,
            @Valid @RequestPart("data") ProductRequest data,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return productService.update(id, data, files);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }
}
