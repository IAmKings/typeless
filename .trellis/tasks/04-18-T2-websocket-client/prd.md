# macOS 语音输入应用 - T2: WebSocket 客户端封装

## Goal

实现火山引擎 ASR WebSocket 客户端的完整功能，建立与 ASR 服务器的双向流式通信。

## Requirements

- [ ] **WebSocket 连接管理**：实现 `connect()` / `disconnect()` 方法，支持重连机制
- [ ] **认证与连接**：使用 appKey、accessKey、resourceId 建立 WebSocket 连接
- [ ] **音频数据发送**：将 PCM 音频数据封装为二进制帧并发送
- [ ] **转写结果处理**：解析服务器返回的转写结果并通知渲染进程
- [ ] **连接状态管理**：维护 `connected` / `disconnected` / `connecting` 状态
- [ ] **错误处理**：处理网络错误、超时、服务器错误，并通知渲染进程

## Technical Notes

### WebSocket 地址

```
wss://openspeech.bytedance.com/api/v3/sauc/bigmodel
```

### 请求头

| Header | Value |
|--------|-------|
| X-Api-App-Key | appKey |
| X-Api-Access-Key | accessKey |
| X-Api-Resource-Id | resourceId |
| X-Api-Connect-Id | UUID (客户端生成) |

### 二进制帧格式

```
[version(1)][type(1)][reserved(2)][data_size(4)][data]
```

- `version`: 1 byte, 值 1
- `type`: 1 byte, 值 0x01 表示音频数据
- `reserved`: 2 bytes, 值 0
- `data_size`: 4 bytes, big-endian, 数据部分长度
- `data`: PCM 音频数据

### 响应格式（推测）

服务器返回 JSON 转写结果：
```typescript
{
  text: string;
  isFinal: boolean;
  timestamp: number;
}
```

### IPC 通道

| 通道 | 方向 | 用途 |
|------|------|------|
| `asr:connect` | R→M | 连接 ASR 服务器 |
| `asr:disconnect` | R→M | 断开连接 |
| `asr:sendAudio` | R→M | 发送音频数据 |
| `asr:onTranscript` | M→R | 转写结果推送 |
| `asr:onError` | M→R | 错误通知 |
| `asr:onConnectionStatus` | M→R | 连接状态变化 |

### 服务层设计

```
src/main/services/asr/
├── types.ts              # Zod schemas + TypeScript types
├── asr.service.ts        # WebSocket 客户端实现
└── lib/
    └── codec.ts         # 二进制帧编解码
```

## Acceptance Criteria

- [ ] `connect()` 成功建立 WebSocket 连接
- [ ] 连接失败时返回明确的错误信息
- [ ] `disconnect()` 正确关闭连接
- [ ] `sendAudio()` 将音频数据发送到服务器
- [ ] 服务器转写结果正确解析并通知渲染进程
- [ ] 连接状态变化（connected/disconnected）通知渲染进程
- [ ] 错误情况正确处理并通知渲染进程
- [ ] 断开连接后自动重连（可选）
