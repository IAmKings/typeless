# Open Typeless

macOS 语音输入应用 - 基于 Electron + Vite + TypeScript

## 功能特性

- 🎤 **实时语音输入** - 使用麦克风采集音频，实时转换为文本
- 🔌 **WebSocket 通信** - 与火山引擎 ASR 服务双向流式通信
- ⌨️ **全局快捷键** - 通过系统快捷键触发语音输入
- 📝 **文本注入** - 直接将转写文本注入到当前焦点应用
- 🪟 **悬浮窗口** - 简洁的悬浮式用户界面

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Audio UI    │  │ Settings    │  │ Status Display  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                  │          │
│         └────────────────┼──────────────────┘          │
│                          │                               │
│              window.api (contextBridge)                │
└──────────────────────────┼───────────────────────────────┘
                           │ IPC
┌──────────────────────────┼───────────────────────────────┐
│                    Main Process                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ ASR Handler │  │Audio Handler│  │ Hotkey Handler  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ ASR Service │  │Audio Service│  │Permission Svc  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 模块结构

### IPC 通道 (`src/shared/constants/channels.ts`)

| 模块 | 通道 | 说明 |
|------|------|------|
| **ASR** | `asr:connect` | 连接 ASR WebSocket 服务器 |
| | `asr:disconnect` | 断开连接 |
| | `asr:sendAudio` | 发送音频数据 |
| | `asr:getConfig` | 获取环境配置 |
| | `asr:validateConfig` | 验证配置有效性 |
| | `asr:healthCheck` | 健康检查 |
| | `asr:onTranscript` | 转写结果回调 |
| | `asr:onError` | 错误回调 |
| | `asr:onConnectionStatus` | 连接状态回调 |
| **AUDIO** | `audio:startRecording` | 开始录音 |
| | `audio:stopRecording` | 停止录音 |
| | `audio:getDevices` | 获取音频设备列表 |
| | `audio:onLevel` | 音量级别回调 |
| | `audio:onAudioData` | 音频数据回调 |
| **HOTKEY** | `hotkey:register` | 注册快捷键 |
| | `hotkey:unregister` | 注销快捷键 |
| | `hotkey:onTriggered` | 快捷键触发回调 |
| **TEXT** | `text:inject` | 注入文本到焦点应用 |
| **FLOATING_WINDOW** | `floatingWindow:show` | 显示悬浮窗 |
| | `floatingWindow:hide` | 隐藏悬浮窗 |
| | `floatingWindow:toggle` | 切换悬浮窗显示状态 |
| | `floatingWindow:onFocused` | 悬浮窗获得焦点回调 |
| **SETTINGS** | `settings:get` | 获取设置项 |
| | `settings:set` | 设置设置项 |
| **PERMISSION** | `permission:checkMicrophone` | 检查麦克风权限 |
| | `permission:requestMicrophone` | 请求麦克风权限 |

## 服务模块

### ASR 服务 (`src/main/services/asr/`)

| 文件 | 说明 |
|------|------|
| `types.ts` | Zod schemas 和 TypeScript 类型定义 |
| `config.ts` | 环境变量配置加载器 |
| `asr.service.ts` | WebSocket 客户端实现 |
| `api.ts` | REST API 调用（配置验证、健康检查） |
| `lib/codec.ts` | 二进制帧编解码器 |

### Audio 服务 (`src/main/services/`)

| 文件 | 说明 |
|------|------|
| `audio.service.ts` | 音频状态管理（主进程） |
| `permission.service.ts` | 系统权限管理 |

## 环境配置

### 1. 创建配置文件

```bash
cp .env.example .env
```

### 2. 编辑 `.env` 文件

```env
# Volcano Engine ASR Configuration
VOLCENGINE_APP_ID=your_app_key_here
VOLCENGINE_ACCESS_TOKEN=your_access_token_here
VOLCENGINE_RESOURCE_ID=your_resource_id_here
```

### 配置属性映射

| .env 变量 | ASR 配置字段 | 说明 |
|-----------|--------------|------|
| `VOLCENGINE_APP_ID` | `appKey` | 应用标识 |
| `VOLCENGINE_ACCESS_TOKEN` | `accessKey` | 访问令牌 |
| `VOLCENGINE_RESOURCE_ID` | `resourceId` | 资源标识 |

### 3. 获取 API 密钥

访问 [火山引擎控制台](https://console.volcengine.com/) 注册账号并获取密钥。

## 开发

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm start
```

### 代码检查

```bash
pnpm lint
```

### 构建应用

```bash
pnpm make
```

## 项目结构

```
open-typeless/
├── src/
│   ├── main/
│   │   ├── ipc/                    # IPC 处理器
│   │   │   ├── index.ts            # 处理器注册入口
│   │   │   ├── asr.handler.ts     # ASR WebSocket 处理器
│   │   │   ├── asr-api.handler.ts # ASR REST API 处理器
│   │   │   ├── audio.handler.ts    # 音频采集处理器
│   │   │   ├── hotkey.handler.ts   # 全局快捷键处理器
│   │   │   ├── text.handler.ts     # 文本注入处理器
│   │   │   ├── settings.handler.ts # 设置存储处理器
│   │   │   ├── permission.handler.ts # 权限处理器
│   │   │   └── floating-window.handler.ts # 悬浮窗处理器
│   │   ├── services/
│   │   │   ├── asr/               # ASR 服务模块
│   │   │   │   ├── types.ts       # 类型定义
│   │   │   │   ├── config.ts      # 配置加载
│   │   │   │   ├── asr.service.ts # WebSocket 客户端
│   │   │   │   ├── api.ts         # REST API
│   │   │   │   └── lib/codec.ts   # 编解码器
│   │   │   ├── audio.service.ts   # 音频状态管理
│   │   │   └── permission.service.ts # 权限管理
│   │   └── db/                    # 数据库（预留）
│   ├── renderer/
│   │   ├── services/
│   │   │   ├── audio.service.ts   # 音频采集（渲染进程）
│   │   │   └── audio-capture.ts   # 桥接模块
│   │   └── index.css
│   ├── shared/
│   │   └── constants/
│   │       └── channels.ts        # IPC 通道常量
│   ├── main.ts                   # Electron 主进程入口
│   ├── preload.ts                # Preload 脚本
│   └── renderer.ts               # 渲染进程入口
├── .env.example                  # 环境变量模板
├── index.html                   # HTML 入口
├── forge.config.ts              # Electron Forge 配置
├── package.json
└── README.md
```

## 技术栈

- **框架**: Electron 41
- **构建工具**: Vite + Electron Forge
- **语言**: TypeScript (strict mode)
- **包管理**: pnpm
- **编码规范**: ESLint

## 许可证

MIT
