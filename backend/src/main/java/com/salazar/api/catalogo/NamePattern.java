package com.salazar.api.catalogo;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class NamePattern {
    static final int MAX_LENGTH = 100;
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");

    private NamePattern() {}

    /** Returns a LIKE pattern for the name search, or null when there is nothing to search for. */
    public static String from(String raw) {
        if (raw == null) return null;
        String term = raw.strip();
        if (term.isEmpty()) return null;
        if (term.length() > MAX_LENGTH) term = term.substring(0, MAX_LENGTH).strip();

        String normalized = DIACRITICS
                .matcher(Normalizer.normalize(term.toLowerCase(Locale.ROOT), Normalizer.Form.NFD))
                .replaceAll("");
        // The user's wildcards are literal text: only the surrounding % are ours. "!" is the LIKE escape
        // character because HQL string literals can't hold a bare backslash.
        String escaped = normalized.replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return "%" + escaped + "%";
    }
}
