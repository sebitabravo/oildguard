# Imagen en dos etapas: compila en release y deja solo el binario en runtime.
FROM rust:1.98.1-slim-bookworm AS build
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release --locked --bin oilguard-edge

FROM debian:bookworm-slim
RUN useradd --system --no-create-home edge
COPY --from=build /src/target/release/oilguard-edge /usr/local/bin/oilguard-edge
USER edge
ENTRYPOINT ["oilguard-edge"]
