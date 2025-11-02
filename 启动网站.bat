@echo off
chcp 65001 >nul
title COCA 5000 高频词学习网站 - 本地服务器

echo.
echo ============================================================
echo   COCA 5000 高频词学习网站 - 本地服务器
echo ============================================================
echo.
echo 正在检测 Python 环境...
echo.

:: 检测 Python 3
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 检测到 Python
    echo.
    echo 正在启动服务器...
    echo.
    python start_server.py
    goto :end
)

:: 检测 py launcher
py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 检测到 Python ^(通过 py^)
    echo.
    echo 正在启动服务器...
    echo.
    py start_server.py
    goto :end
)

:: 检测 Python 2
python2 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 检测到 Python 2
    echo.
    echo 正在启动服务器...
    echo.
    python2 start_server.py
    goto :end
)

:: 如果没有找到 Python
echo ✗ 未检测到 Python 环境！
echo.
echo ============================================================
echo   解决方法：
echo ============================================================
echo.
echo 方法 1: 安装 Python ^(推荐^)
echo    1. 访问 https://www.python.org/downloads/
echo    2. 下载并安装 Python 3.x
echo    3. 安装时勾选 "Add Python to PATH"
echo    4. 重新运行此脚本
echo.
echo 方法 2: 使用 Node.js
echo    如果您已安装 Node.js，可以在命令行运行：
echo    npx http-server -p 8000
echo.
echo 方法 3: 使用 VSCode 插件
echo    安装 "Live Server" 插件，右键点击 index.html
echo    选择 "Open with Live Server"
echo.
echo ============================================================
echo.
pause
goto :end

:end
exit /b
