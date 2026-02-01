# syntax=docker/dockerfile:1
FROM rust:1.85-slim-bookworm AS builder

WORKDIR /app

# Install required dependencies for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy everything and build
COPY . .

# Build in release mode with sparse registry for faster index
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse
RUN cargo build --release

# Runtime image
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/radhat-backend /app/radhat-backend

# Create data directory for volume mount
RUN mkdir -p /app/data

# Set environment defaults - use volume path for persistence
ENV DATABASE_URL=sqlite:/app/data/data.db?mode=rwc
ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001

CMD ["/app/radhat-backend"]
