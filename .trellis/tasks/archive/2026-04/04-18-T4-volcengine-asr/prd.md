# macOS 语音输入应用 - T4: 火山引擎 ASR API 集成

## Goal

完成火山引擎 ASR API 的完整集成，包括认证、配置验证和健康检查。

## Requirements

- [ ] **API 配置验证**：验证 appKey、accessKey、resourceId 的有效性
- [ ] **连接测试**：在正式连接前测试 ASR API 连通性
- [ ] **健康检查**：提供 ASR 服务健康状态查询
- [ ] **错误码映射**：将 ASR API 错误码转换为用户友好的错误信息

## Technical Notes

### API 端点

火山引擎 ASR 服务可能提供 REST API 用于：
- 认证 token 获取 (如果使用 OAuth 方式)
- 服务健康检查
- 用量查询

### 已完成的工作 (T2)

T2 已经实现了：
- WebSocket 连接管理
- 音频数据发送
- 转写结果接收

### T4 需要补充

T4 需要补充 REST API 相关功能：
- 配置验证 API
- 健康检查 API
- 错误码处理

## Acceptance Criteria

- [ ] validateConfig() 验证 ASR 配置是否有效
- [ ] healthCheck() 返回 ASR 服务健康状态
- [ ] 错误码转换为用户友好信息
