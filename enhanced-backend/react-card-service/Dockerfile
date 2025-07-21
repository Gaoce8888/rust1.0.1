FROM rust:1.70 as builder

WORKDIR /app

# 复制Cargo.toml和Cargo.lock
COPY Cargo.toml Cargo.lock ./

# 创建虚拟项目来缓存依赖
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# 复制源代码
COPY src ./src
COPY templates ./templates

# 重新构建应用
RUN cargo build --release

# 运行时镜像
FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从builder阶段复制二进制文件
COPY --from=builder /app/target/release/react-card-service .

# 复制模板文件
COPY --from=builder /app/templates ./templates

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV RUST_LOG=info
ENV PORT=8082

# 暴露端口
EXPOSE 8082

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8082/health || exit 1

# 运行应用
CMD ["./react-card-service"]