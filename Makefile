# Crontab UI Makefile

# 变量定义
APP_NAME = crontab-ui
VERSION = 0.1.0

# 默认目标
.PHONY: all
all: help

# 帮助信息
.PHONY: help
help:
	@echo "Crontab UI 构建工具"
	@echo ""
	@echo "可用命令:"
	@echo "  make install      - 安装依赖"
	@echo "  make dev          - 启动开发服务器"
	@echo "  make build        - 构建前端资源"
	@echo "  make release      - 打包应用 (macOS)"
	@echo "  make clean        - 清理构建文件"
	@echo ""

# 安装依赖
.PHONY: install
install:
	@echo "安装依赖..."
	npm install

# 开发服务器
.PHONY: dev
dev:
	@echo "启动开发服务器..."
	npm run tauri dev

# 构建前端资源
.PHONY: build
build:
	@echo "构建前端资源..."
	npm run build

# 打包 macOS 应用
.PHONY: release
release: build
	@echo "打包 macOS 应用..."
	npm run tauri build

# 清理构建文件
.PHONY: clean
clean:
	@echo "清理构建文件..."
	rm -rf dist
	rm -rf src-tauri/target
	rm -rf node_modules/.vite
	@echo "清理完成"

# 版本信息
.PHONY: version
version:
	@echo "$(APP_NAME) v$(VERSION)" 