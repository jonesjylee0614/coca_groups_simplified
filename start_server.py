#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
COCA 5000 高频词学习网站 - 本地服务器启动脚本
"""

import sys
import os
import webbrowser
import time
from threading import Timer

# Python 2/3 兼容
if sys.version_info[0] == 3:
    from http.server import HTTPServer, SimpleHTTPRequestHandler
else:
    from BaseHTTPServer import HTTPServer
    from SimpleHTTPServer import SimpleHTTPRequestHandler


class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，添加中文文件名支持"""

    def end_headers(self):
        # 添加CORS头，允许跨域请求
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)

    def log_message(self, format, *args):
        """自定义日志输出"""
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


def open_browser(url, delay=1.5):
    """延迟打开浏览器"""
    time.sleep(delay)
    try:
        webbrowser.open(url)
        print("✓ 已在浏览器中打开网站")
    except:
        print("✗ 自动打开浏览器失败，请手动访问: %s" % url)


def main():
    # 配置
    PORT = 8000
    HOST = 'localhost'

    # 切换到脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    print("=" * 60)
    print("  COCA 5000 高频词学习网站 - 本地服务器")
    print("=" * 60)
    print()
    print("📚 服务器配置:")
    print("   地址: http://%s:%d" % (HOST, PORT))
    print("   目录: %s" % script_dir)
    print()
    print("🚀 正在启动服务器...")
    print()

    # 创建服务器
    try:
        server = HTTPServer((HOST, PORT), CustomHTTPRequestHandler)
        server_url = "http://%s:%d" % (HOST, PORT)

        print("✓ 服务器启动成功!")
        print()
        print("📖 使用说明:")
        print("   1. 在浏览器中访问: %s" % server_url)
        print("   2. 开始学习!")
        print()
        print("⚠️  提示:")
        print("   - 按 Ctrl+C 可以停止服务器")
        print("   - 保持此窗口打开，否则网站将无法访问")
        print()
        print("=" * 60)
        print()

        # 延迟打开浏览器
        Timer(1.5, open_browser, args=(server_url,)).start()

        # 启动服务器
        print("🔄 服务器运行中，等待请求...")
        print()
        server.serve_forever()

    except OSError as e:
        if e.errno == 48 or e.errno == 10048:  # Address already in use
            print("✗ 错误: 端口 %d 已被占用" % PORT)
            print()
            print("解决方法:")
            print("   1. 关闭其他占用端口 %d 的程序" % PORT)
            print("   2. 或修改脚本中的 PORT 变量为其他端口号")
            sys.exit(1)
        else:
            raise
    except KeyboardInterrupt:
        print()
        print()
        print("=" * 60)
        print("👋 服务器已停止")
        print("=" * 60)
        sys.exit(0)
    except Exception as e:
        print("✗ 启动失败: %s" % str(e))
        sys.exit(1)


if __name__ == '__main__':
    main()
