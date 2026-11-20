package com.salazar.api.catalogo;

public enum ReviewFilter {
    ALL("all", 1, 5),
    POSITIVE("positive", 4, 5),
    NEUTRAL("neutral", 3, 3),
    NEGATIVE("negative", 1, 2);

    private final String value;
    private final int minRating;
    private final int maxRating;

    ReviewFilter(String value, int minRating, int maxRating) {
        this.value = value;
        this.minRating = minRating;
        this.maxRating = maxRating;
    }

    public static ReviewFilter from(String value) {
        for (ReviewFilter filter : values()) {
            if (filter.value.equals(value)) return filter;
        }
        return ALL;
    }

    public int minRating() {
        return minRating;
    }

    public int maxRating() {
        return maxRating;
    }
}
