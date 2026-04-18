# T3: IPC 通道设计

## 目标

设计并实现 macOS 语音输入应用的 IPC 通道架构。

## 需求分析

### 语音输入应用的数据流

```
[麦克风] → [音频采集] → [WebSocket] → [ASR API]
                                           ↓
[目标应用] ← [文本注入] ← [识别结果]
```

### 需要暴露的 IPC 通道

| 通道 | 方向 | 用途 |
|------|------|------|
| `asr:connect` | R→M | 连接 ASR WebSocket |
| `asr:disconnect` | R→M | 断开 ASR 连接 |
| `asr:send-audio` | R→M | 发送音频数据 |
| `asr:on-transcript` | M→R | 接收识别结果（流式） |
| `asr:on-error` | M→R | 接收错误 |
| `audio:start-recording` | R→M | 开始录音 |
| `audio:stop-recording` | R→M | 停止录音 |
| `audio:on-level` | M→R | 录音音量回调 |
| `hotkey:register` | R→M | 注册全局快捷键 |
| `hotkey:unregister` | R→M | 注销快捷键 |
| `hotkey:on-triggered` | M→R | 快捷键触发回调 |
| `text:inject` | R→M | 注入文本到目标应用 |
| `window:show-floating` | R→M | 显示悬浮窗口 |
| `window:hide-floating` | R→M | 隐藏悬浮窗口 |
| `window:toggle-floating` | R→M | 切换悬浮窗口 |
| `settings:get` | R→M | 获取设置 |
| `settings:set` | R→M | 保存设置 |
| `permission:check-microphone` | R→M | 检查麦克风权限 |
| `permission:request-microphone` | R→M | 请求麦克风权限 |

## 技术方案

### 目录结构

```
src/
├── main/
│   ├── index.ts              # 主进程入口
│   ├── ipc/
│   │   ├── index.ts          # 注册所有 handler
│   │   ├── asr.handler.ts    # ASR 相关
│   │   ├── audio.handler.ts  # 音频采集相关
│   │   ├── hotkey.handler.ts # 全局快捷键
│   │   ├── text.handler.ts   # 文本注入
│   │   ├── window.handler.ts # 窗口管理
│   │   ├── settings.handler.ts
│   │   └── permission.handler.ts
│   └── services/
│       ├── audio.service.ts  # 音频采集服务
│       ├── asr.service.ts    # WebSocket ASR 客户端
│       └── hotkey.service.ts # 全局快捷键服务
├── preload/
│   └── index.ts              # contextBridge 暴露 API
└── renderer/
    └── ...
```

### preload API 设计

```typescript
// window.api 类型定义
interface Window {
  api: {
    // ASR
    asr: {
      connect: (config: ASRConfig) => Promise<void>;
      disconnect: () => Promise<void>;
      sendAudio: (audioData: ArrayBuffer) => void; // 无需等待
      onTranscript: (callback: (text: string, isFinal: boolean) => void) => () => void;
      onError: (callback: (error: string) => void) => () => void;
      onConnectionStatus: (callback: (status: 'connected' | 'disconnected' | 'connecting') => void) => () => void;
    };
    // 音频
    audio: {
      startRecording: () => Promise<void>;
      stopRecording: () => Promise<void>;
      onLevel: (callback: (level: number) => void) => () => void;
      getDevices: () => Promise<AudioDevice[]>;
    };
    // 快捷键
    hotkey: {
      register: (shortcut: string) => Promise<boolean>;
      unregister: (shortcut: string) => Promise<void>;
      unregisterAll: () => Promise<void>;
      onTriggered: (callback: (shortcut: string) => void) => () => void;
    };
    // 文本注入
    text: {
      inject: (text: string) => Promise<void>;
    };
    // 窗口
    floatingWindow: {
      show: () => void;
      hide: () => void;
      toggle: () => void;
      isVisible: () => Promise<boolean>;
    };
    // 设置
    settings: {
      get: <T>(key: string) => Promise<T | null>;
      set: <T>(key: string, value: T) => Promise<void>;
    };
    // 权限
    permission: {
      checkMicrophone: () => Promise<boolean>;
      requestMicrophone: () => Promise<boolean>;
    };
  };
}
```

## 实现步骤

1. 创建目录结构
2. 定义 IPC_CHANNELS 常量
3. 实现各个 handler
4. 在 preload 中暴露 window.api
5. 添加 TypeScript 类型声明

## 验收标准

- [ ] 所有 channel 常量已定义在 shared/constants/channels.ts
- [ ] preload.ts 正确暴露所有 API
- [ ] 每个 handler 有独立的文件
- [ ] 类型定义完整，无 any
- [ ] 双向通信（Main↔Renderer）正常工作
