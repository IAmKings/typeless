# T11: 错误处理与重连

## Goal
完善 ASR 连接的错误处理和自动重连机制。

## Requirements
- 连接错误处理：WebSocket 断开时的错误处理
- 自动重连：网络波动时自动重连
- 重试策略：指数退避重试
- 用户通知：显示连接状态变化

## Acceptance Criteria
- [ ] WebSocket 断开时正确处理错误
- [ ] 实现自动重连机制
- [ ] 重连使用指数退避策略
- [ ] UI 正确显示连接状态

## Technical Notes
- 参考 asr.service.ts 现有重连逻辑
- 使用 maxReconnectAttempts 限制重试
- 遵循 error-handling.md 规范
