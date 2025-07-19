#!/bin/bash

echo "🔧 开始内存优化编译..."

# 设置环境变量以减少内存使用
export RUSTFLAGS="-C target-cpu=native -C target-feature=+crt-static"
export CARGO_INCREMENTAL=0

# 清理之前的编译缓存
echo "🧹 清理编译缓存..."
cargo clean

# 分步编译以减少内存使用
echo "📦 编译依赖..."
cargo build --release --lib

echo "🔗 编译主程序..."
cargo build --release --bin kefu-system

echo "✅ 编译完成！"
echo "📁 可执行文件位置: target/release/kefu-system"