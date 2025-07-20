@echo off
echo ========================================
echo 企业级客服系统 - Windows 11 编译脚本
echo ========================================

echo.
echo 正在检查Rust环境...
rustc --version
if %errorlevel% neq 0 (
    echo 错误: 未找到Rust编译器，请先安装Rust
    echo 访问 https://rustup.rs/ 安装Rust
    pause
    exit /b 1
)

echo.
echo 正在检查Windows目标...
rustup target list --installed | findstr x86_64-pc-windows
if %errorlevel% neq 0 (
    echo 正在安装Windows目标...
    rustup target add x86_64-pc-windows-msvc
    rustup target add x86_64-pc-windows-gnu
)

echo.
echo 正在清理之前的编译产物...
cargo clean

echo.
echo 正在编译项目 (Release模式)...
echo 选择编译目标:
echo 1. x86_64-pc-windows-msvc (推荐，需要Visual Studio)
echo 2. x86_64-pc-windows-gnu (使用MinGW)
echo.
set /p choice="请选择编译目标 (1 或 2): "

if "%choice%"=="1" (
    echo 使用 MSVC 目标编译...
    cargo build --release --target x86_64-pc-windows-msvc
    if %errorlevel% neq 0 (
        echo.
        echo 错误: MSVC编译失败
        echo 请确保已安装Visual Studio 2017或更高版本，并包含C++工具
        echo 或者选择GNU目标进行编译
        pause
        exit /b 1
    )
    set TARGET_DIR=target\x86_64-pc-windows-msvc\release
) else if "%choice%"=="2" (
    echo 使用 GNU 目标编译...
    cargo build --release --target x86_64-pc-windows-gnu
    if %errorlevel% neq 0 (
        echo.
        echo 错误: GNU编译失败
        echo 请确保已安装MinGW-w64
        pause
        exit /b 1
    )
    set TARGET_DIR=target\x86_64-pc-windows-gnu\release
) else (
    echo 无效选择，使用默认MSVC目标...
    cargo build --release --target x86_64-pc-windows-msvc
    if %errorlevel% neq 0 (
        echo 编译失败，尝试GNU目标...
        cargo build --release --target x86_64-pc-windows-gnu
        if %errorlevel% neq 0 (
            echo 所有编译目标都失败了
            pause
            exit /b 1
        )
        set TARGET_DIR=target\x86_64-pc-windows-gnu\release
    ) else (
        set TARGET_DIR=target\x86_64-pc-windows-msvc\release
    )
)

echo.
echo ========================================
echo 编译成功！
echo ========================================

echo.
echo 可执行文件位置: %TARGET_DIR%\kefu-system.exe
echo.

if exist "%TARGET_DIR%\kefu-system.exe" (
    echo 文件信息:
    dir "%TARGET_DIR%\kefu-system.exe"
    echo.
    
    echo 是否要运行程序？(y/n)
    set /p run_choice="选择: "
    if /i "%run_choice%"=="y" (
        echo 正在启动程序...
        cd %TARGET_DIR%
        kefu-system.exe
    )
) else (
    echo 警告: 未找到可执行文件
)

echo.
echo 编译完成！
pause