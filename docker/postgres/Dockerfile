# The official postgis/postgis image has no arm64 build; the PGDG repository already configured in postgres:16 ships the package for both architectures
FROM postgres:16
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
