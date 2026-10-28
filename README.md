# Art Style · Lehuye Artist List

> 全球艺术家 / 画家视觉风格数据库管理系统 · Global Artist / Painter Visual Style Database

一个基于 **Node.js + Express + Sharp + Electron** 的轻量级应用，用于按国家管理全球艺术家档案（中英文名、出生日期、简介），并为每位艺术家自动生成 **原图 / 中图 / 缩略图** 三尺寸 WebP 图片，支持检索、新增、编辑、删除与图片上传。既可作为 Web 服务运行，也可打包为 **Windows / macOS / Linux** 桌面应用。

A lightweight app built with **Node.js + Express + Sharp + Electron** that manages global artist profiles (Chinese/English names, birth date, description) by country, auto-generates **origin / mid / thumb** three-size WebP images for each artist, and supports search, add, edit, delete and image upload. It runs both as a web service and as a packaged **Windows / macOS / Linux** desktop application.

---

## 目录 · Table of Contents

- [项目简介 · Introduction](#项目简介--introduction)
- [功能特性 · Features](#功能特性--features)
- [技术栈 · Tech Stack](#技术栈--tech-stack)
- [目录结构 · Directory Structure](#目录结构--directory-structure)
- [快速开始 · Quick Start](#快速开始--quick-start)
- [使用指南 · Usage Guide](#使用指南--usage-guide)
- [打包桌面应用 · Package as Desktop App](#打包桌面应用--package-as-desktop-app)
- [API 文档 · API Reference](#api-文档--api-reference)
- [数据格式 · Data Format](#数据格式--data-format)
- [图片处理说明 · Image Processing](#图片处理说明--image-processing)
- [辅助工具 · Helper Script](#辅助工具--helper-script)
- [常见问题 · FAQ](#常见问题--faq)

---

## 项目简介 · Introduction

**Art Style** 是一个面向 AI 绘画 / 视觉风格研究场景的艺术家资料库。它以「国家 → 艺术家」为组织维度，将全球知名画家、插画师与动画工作室的档案以 JSON 文件形式存储，并通过浏览器提供可视化的卡片式浏览、检索与维护界面。

**Art Style** is an artist database designed for AI painting / visual-style research. It organizes profiles by "country → artist", stores records of famous painters, illustrators and animation studios as JSON files, and provides a card-based visual browsing, searching and maintenance UI in the browser.

系统默认收录 **150 个国家/地区** 数据文件、**505 条** 艺术家记录，每条记录通过 `unique_code`（唯一编码）关联三张自动生成的图片。

The system ships with **150 country/region** data files and **505** artist records. Each record is linked to three auto-generated images via a `unique_code`.

---

## 功能特性 · Features

| 功能 Feature | 说明 Description |
| --- | --- |
| 卡片式画廊浏览 | 深色赛博风格响应式网格，鼠标悬停高亮，滚动条悬停显示 Card-based dark cyber-style responsive grid gallery with hover highlight and scrollbar |
| 全局搜索 | 支持按 UID / 英文名 / 中文名 / 国家实时过滤 Search by UID / English name / Chinese name / country in real time |
| 新增艺术家 | 选择国家 + 中文名 + 英文名 + 8 位生日 + 简介，自动生成唯一编码 Add artist with auto-generated unique code |
| 编辑艺术家 | 修改姓名 / 生日 / 简介；生日变更时自动重新编号并重命名图片 Edit profile; re-numbers and renames images when birth date changes |
| 删除艺术家 | 一键删除记录并同步清理三张图片 Delete record and its three images |
| 图片上传 | 点击卡片缩略图即可上传，Sharp 自动生成原图 / 中图 / 缩略图 Click card thumbnail to upload; Sharp auto-generates origin/mid/thumb |
| 一键复制 | 点击 UID / 姓名 / 国家文本即可复制到剪贴板 Click UID / name / country text to copy to clipboard |
| 图片自动重命名 | 编辑生日后关联图片随新编码同步改名 Images auto-renamed to match new code after birth-date edits |
| 桌面应用 | Electron 壳内嵌启动本地服务，三平台安装包，开箱即用 Desktop app with embedded local server and installers for all three platforms |

---

## 技术栈 · Tech Stack

| 层 Layer | 技术 Technology |
| --- | --- |
| 桌面壳 Desktop Shell | Electron `^45.1.0`（主进程内嵌 Express 服务） |
| 后端 Backend | Node.js + Express `^5.3.0` |
| 图片处理 Image | Sharp `^0.35.5`（WebP 编解码、缩放、裁剪） |
| 文件上传 Upload | Multer `^2.4.0`（内存存储 memory storage） |
| 打包 Build | electron-builder `^26.18.0`（NSIS / dmg / AppImage+deb） |
| 前端 Frontend | 原生 HTML + CSS + JavaScript（无框架，内联样式） |
| 数据存储 Data | JSON 文件系统（`painters/` 目录按国家分文件） |

> 环境要求 Requirements：Node.js ≥ 18（Express 5 与 Sharp 0.35 的最低要求）。

---

## 目录结构 · Directory Structure

```
artStyle/
├── main.js                  # Express 服务端入口（端口 3331）Server entry (port 3331)
├── electron/
│   └── main.js              # Electron 主进程入口（启动服务 + 桌面窗口）Desktop entry
├── index.html               # 前端页面（卡片画廊 + 弹窗表单）Front-end UI
├── style.css                # 备用画廊样式表（深色玻璃拟态风格）Alternative gallery stylesheet
├── package.json             # 依赖声明 + 打包配置 Dependencies & electron-builder config
├── package-lock.json        # 依赖锁定文件 Lock file
├── lehuye.config.json       # 应用元数据（名称/描述/类型）App metadata
├── Powershell               # build.ps1：生成绘画风格素材库目录树脚本 Style-library tree generator
├── README.md                # 本文档 This document
├── painters/                # 艺术家数据，按国家分文件（150 个 JSON）
│   ├── 826_英国_GB.json     # 命名规则：{数字代码}_{中文名}_{ISO2}.json
│   └── ...
├── images/                  # 图片资源目录
│   ├── origin/              # 原图（原始尺寸 WebP）
│   ├── mid/                 # 中图（最长边 ≤1200px）
│   └── thumb/               # 缩略图（400×400 居中裁剪）
└── dist/                    # 打包产物（安装包 + 免安装版）Build output
    ├── ArtStyle Setup 1.0.0.exe   # Windows NSIS 安装包
    └── win-unpacked/              # 免安装绿色版目录
```

---

## 快速开始 · Quick Start

### 1. 环境准备 Prerequisites

- 安装 [Node.js](https://nodejs.org/) ≥ 18
- 推荐使用 npm（随 Node.js 附带）

### 2. 安装依赖 Install dependencies

在项目根目录执行 / Run in the project root:

```bash
npm install
```

> 将安装 `express`、`multer`、`sharp` 三个运行时依赖，以及 `electron`、`electron-builder` 两个开发依赖。

### 3. 启动服务 Start the server

```bash
node main.js
```

启动成功后控制台输出：

```
✅ 服务启动：http://127.0.0.1:3331
```

### 4. 打开应用 Open the app

浏览器访问：**http://127.0.0.1:3331**

服务启动时会自动创建 `images/origin`、`images/mid`、`images/thumb` 目录；`painters/` 目录不存在时也会自动创建。

### 5. 以桌面应用模式运行 Run as a desktop app（开发模式）

```bash
npm start
```

等价于 `electron .`：自动启动内嵌 Express 服务并打开桌面窗口。端口 `3331` 被占用时自动顺延。

### 6. 直接运行打包好的桌面应用 Run the packaged app

- 双击 `dist/ArtStyle Setup 1.0.0.exe` 安装（Windows），或直接运行 `dist/win-unpacked/ArtStyle.exe`（免安装绿色版）
- 打包版首次启动会把种子数据（`painters/`、`images/`）复制到用户数据目录 `%APPDATA%\art-style\data`，之后的增删改全部写入该目录，卸载或重装不会丢失数据

---

## 使用指南 · Usage Guide

| 操作 Action | 步骤 Steps |
| --- | --- |
| 浏览 Browse | 打开首页即展示全部艺术家卡片（按生日倒序）Open the homepage to see all artist cards (sorted by birth date, newest first) |
| 搜索 Search | 顶部输入框输入 UID / 英文名 / 中文名 / 国家，实时过滤 Type UID / EN name / CN name / country in the top search box |
| 新增 Add | 点击右上角 **Add Painter** → 填写国家、中文名、英文名、8 位生日（如 `14970101`）、简介 → 提交 Click **Add Painter** → fill country, names, 8-digit birth date, description → submit |
| 上传图片 Upload | 点击任意卡片中央的缩略图区域 → 选择本地图片 → 自动生成三尺寸 WebP |
| 编辑 Edit | 点击卡片 **编辑** 按钮 → 修改字段 → 提交；若修改生日，编码与图片文件名会自动更新 |
| 删除 Delete | 点击卡片 **删除** 按钮 → 确认弹窗 → 记录与三张图片一并删除 |
| 复制 Copy | 点击卡片上的 UID / 姓名 / 国家文本，一键复制到剪贴板 |

**说明**：新添加的艺术家在首次上传图片前，卡片缩略图区域显示占位提示；上传成功后立即刷新为缩略图。

---

## 打包桌面应用 · Package as Desktop App

使用 `electron-builder` 一键打包三平台安装包（配置已写入 `package.json` 的 `build` 字段）。

| 平台 Platform | 命令 Command | 产物 Output |
| --- | --- | --- |
| Windows | `npm run dist:win` | `dist/ArtStyle Setup 1.0.0.exe`（NSIS 安装包）+ `dist/win-unpacked/`（绿色版） |
| macOS | `npm run dist:mac`（需在 macOS 上执行） | `dist/ArtStyle-1.0.0.dmg` |
| Linux | `npm run dist:linux`（需在 Linux 上执行） | `dist/ArtStyle-1.0.0.AppImage` + `.deb` |
| 全部 | `npm run dist` | 当前平台默认目标 |

### 打包要点 Notes

- **平台限制**：macOS 安装包只能在 macOS 上构建（Apple 签名与工具链限制），Windows 与 Linux 同理；如需一次产出三平台包，可配置 GitHub Actions 流水线在对应 runner 上构建。
- **国内网络**：`electron` 与构建工具从 GitHub 下载易超时，建议设置镜像后打包：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run dist:win
```

- **数据目录**：打包版将可写数据（`painters/`、`images/`）存放于用户数据目录（Windows 为 `%APPDATA%\art-style\data`），首次运行自动从应用包复制种子数据，卸载重装不影响已录入数据。
- **端口**：桌面版监听 `127.0.0.1:3331`，被占用时自动顺延到空闲端口。
- **应用图标**：当前使用 Electron 默认图标；如需自定义，在 `build` 配置的 `win.icon` / `mac.icon` / `linux.icon` 中指定图标文件后重新打包。

---

## API 文档 · API Reference

Base URL：`http://127.0.0.1:3331`

### `GET /api/painters`
读取全部艺术家记录（汇总所有国家 JSON 文件）。

**响应**：艺术家对象数组
```json
[
  {
    "unique_code": "826149701010",
    "country_numeric": "826",
    "country_alpha2": "GB",
    "country_name": "英国",
    "cn_name": "小汉斯·荷尔拜因",
    "en_name": "Hans Holbein the Younger",
    "birth_8": "14970101",
    "desc": "都铎王朝宫廷肖像画大师..."
  }
]
```

### `GET /api/countries`
读取国家列表（根据 `painters/` 目录文件动态解析）。

**响应**：`[{ country_name, country_numeric, country_alpha2 }]`

### `POST /api/addpainter`
新增艺术家。Body（JSON）：

```json
{
  "country_name": "英国",
  "cn_name": "透纳",
  "en_name": "J. M. W. Turner",
  "birth_8": "17750101",
  "desc": "英国浪漫主义风景巨匠"
}
```

校验：`cn_name / en_name / birth_8 / desc` 必填；`birth_8` 必须为 8 位数字；`country_name` 必须存在于国家表。成功后自动生成唯一编码并写入对应国家 JSON 文件。

### `PUT /api/putpainter`
编辑艺术家。Body（JSON）：

```json
{
  "unique_code": "826177501010",
  "cn_name": "透纳",
  "en_name": "J. M. W. Turner",
  "birth_8": "17750101",
  "desc": "新的简介"
}
```

`unique_code` 必填。若 `birth_8` 变更，将重新生成编码，并把 `images/` 下对应三张图片重命名为新编码。

### `DELETE /api/delpainter`
删除艺术家。Body（JSON）：

```json
{ "unique_code": "826177501010" }
```

同时删除该记录对应的 `origin / mid / thumb` 三张图片。

### `POST /api/upload`
上传艺术家图片。`multipart/form-data`：

| 字段 Field | 说明 Description |
| --- | --- |
| `img` | 图片文件（file，必填） |
| `unique_code` | 目标艺术家的唯一编码（必填） |

服务端用 Sharp 处理并保存三份 WebP：
- `images/origin/{code}.webp` — 原始图片
- `images/mid/{code}.webp` — 等比缩放，最长边 ≤ 1200px（不放大）
- `images/thumb/{code}.webp` — 400×400 居中裁剪

**响应**：`{ "ok": true, "unique_code": "..." }`

---

## 数据格式 · Data Format

### 国家文件命名 Country file naming

`painters/` 下每个国家一个 JSON 文件，文件名为：

```
{country_numeric}_{country_name}_{country_alpha2}.json
```

示例：`826_英国_GB.json`、`840_美国_US.json`

### 唯一编码规则 `unique_code` rule

```
unique_code = {country_numeric} + {birth_8} + {seq:2位}
```

- `country_numeric`：ISO 数字国家代码（如 `826`）
- `birth_8`：8 位出生日期（如 `14970101`）
- `seq`：同国家同生日前缀下递增的两位序号（`00` 起），自动取当前最大序号 + 1

示例：`826149701010` = 英国(826) + 1497-01-01 出生(14970101) + 序号(00)

> 该规则保证编码在文件内唯一；生日编辑后会自动重新编号。

### 艺术家对象字段 Artist object fields

| 字段 Field | 类型 Type | 说明 Description |
| --- | --- | --- |
| `unique_code` | string | 唯一编码（主键） |
| `country_numeric` | string | ISO 数字国家代码 |
| `country_alpha2` | string | ISO 两字母国家代码 |
| `country_name` | string | 国家中文名 |
| `cn_name` | string | 艺术家中文名 |
| `en_name` | string | 艺术家英文名 |
| `birth_8` | string | 8 位生日，格式 `YYYYMMDD` |
| `desc` | string | 简介（风格、代表作等） |

---

## 图片处理说明 · Image Processing

| 规格 Spec | 尺寸 Size | 用途 Usage |
| --- | --- | --- |
| origin | 原始尺寸（不缩放） | 存档原图 Archive original |
| mid | 最长边 ≤ 1200px，等比缩放不放大 | 详情 / 大图浏览 Detail view |
| thumb | 400×400，居中裁剪 | 列表缩略图 List thumbnail |

- 所有输出统一为 **WebP** 格式，文件名 = `{unique_code}.webp`
- 处理由 Sharp 完成（内存缓冲处理，无中间临时文件）
- 前端缩略图路径：`/images/thumb/{unique_code}.webp`；`/images` 为静态资源根目录

---

## 常见问题 · FAQ

**Q：启动报 `Cannot find module 'express'`？**
A：未安装依赖，先执行 `npm install`。

**Q：如何修改端口？**
A：修改 `main.js` 中的 `const PORT = 3331;`，改后重启服务。

**Q：上传图片失败？**
A：请确认提交的 `unique_code` 已存在于艺术家数据中；`img` 与 `unique_code` 均为必填。

**Q：修改生日后图片丢失？**
A：不会丢失。生日变更会触发编码重生成，服务端会自动将三张图片重命名为新编码；若修改前后编码一致，图片保持不动。

**Q：`painters/` 中某些 JSON 文件读取失败？**
A：服务启动与接口调用时会跳过解析失败的文件并输出 `[WARN]` 日志，不影响其他数据。可检查文件是否为合法的 JSON 数组。

---

## 许可 · License

本项目为内部工具应用，默认免费使用（`lehuye.config.json` 中 `chargeType: "free"`）。数据内容来源于公开艺术家资料整理，仅供学习与研究用途。

---


