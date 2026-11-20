package com.salazar.api.catalogo.dto;

import com.salazar.api.catalogo.Review;
import java.time.Instant;

public record ReviewResponse(
        Long id, String authorName, short rating, String comment, Instant createdAt, boolean edited) {
    public static final String ANONYMOUS_AUTHOR = "Cliente";

    public static ReviewResponse from(Review review, String firstName) {
        return new ReviewResponse(
                review.getId(), firstName, review.getRating(), review.getComment(), review.getCreatedAt(), review.isEdited());
    }
}
