# macOS 语音输入应用 - T1: 音频采集模块

## Goal

实现 macOS 平台的实时音频采集模块，使用 AVAudioEngine 进行高保真音频捕获，为 ASR（自动语音识别）提供音频数据流。

## Requirements

- [ ] **AVAudioEngine 音频采集**：使用 AVAudioEngine 获取麦克风输入，输出 PCM 16bit 16kHz 单声道数据
- [ ] **设备枚举**：通过 CoreAudio API 获取系统可用音频输入设备列表
- [ ] **实时音量监测**：实时计算音频 RMS 级别并推送到渲染进程
- [ ] **音频数据回调**：将采集的 PCM 数据通过回调传递给 ASR handler
- [ ] **权限处理**：在录制前检查并请求麦克风权限
- [ ] **优雅停止**：支持立即停止采集，清理所有资源

## Technical Notes

### 层结构

```
┌─────────────────────────────────────────────────────────┐
│  Renderer (React) - 音频设备选择 UI                       │
│    │ window.api.audio.*                                  │
│    ▼                                                     │
│  IPC Layer (preload.ts) - audio:startRecording 等        │
│    │ ipcMain.handle()                                    │
│    ▼                                                     │
│  Main Process - audio.handler.ts - IPC 处理器             │
│    │                                                     │
│    ▼                                                     │
│  audio.service.ts - AVAudioEngine 音频采集               │
│    │                                                     │
│    ▼                                                     │
│  ASR Handler - 接收 PCM ArrayBuffer                      │
└─────────────────────────────────────────────────────────┘
```

### 音频格式

- 采样率：16000 Hz
- 位深度：16 bit
- 声道：单声道 (mono)
- 编码：PCM raw data
- 格式：通过 `audio:onAudioData` IPC 事件发送 ArrayBuffer

### IPC 通道

| 通道 | 方向 | 用途 |
|------|------|------|
| `audio:startRecording` | R→M | 开始录音（可选 deviceId 参数） |
| `audio:stopRecording` | R→M | 停止录音 |
| `audio:getDevices` | R→M | 获取音频设备列表 |
| `audio:onLevel` | M→R | 音量级别推送（0-100） |
| `audio:onAudioData` | M→R | 音频数据推送（ArrayBuffer） |
| `audio:onError` | M→R | 错误通知 |

### 回调注册（新增）

渲染进程需要注册音频数据回调，用于将 PCM 数据发送到 ASR：

```typescript
// preload.ts 新增
window.api.audio.onAudioData(callback: (data: ArrayBuffer) => void): () => void
```

## Acceptance Criteria

- [ ] `getAudioDevices()` 返回系统所有可用的音频输入设备，包含 deviceId、label、isDefault
- [ ] `startRecording()` 成功开始采集音频，无报错
- [ ] 录音过程中，`onLevel` 每 50ms 推送一次音量级别（0-100）
- [ ] `onAudioData` 每 100ms 推送一次 PCM 数据（16000Hz, 16bit, mono）
- [ ] `stopRecording()` 立即停止采集，清理资源
- [ ] 未获取麦克风权限时，`startRecording()` 返回明确的错误信息
- [ ] 多次调用 `startRecording()` 不导致重复启动（返回 Already recording 错误）
- [ ] 设备切换：可以在运行时切换到不同音频设备
