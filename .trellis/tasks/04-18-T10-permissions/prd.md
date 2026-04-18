# T10: 麦克风权限处理

## Goal
实现 macOS 麦克风权限的检查和请求流程。

## Requirements
- 权限检查：在使用麦克风前检查权限状态
- 权限请求：提示用户授权麦克风访问
- 权限引导：用户拒绝时引导到系统设置

## Acceptance Criteria
- [ ] 麦克风权限状态检测
- [ ] 未授权时显示权限请求对话框
- [ ] 拒绝后引导用户到系统设置
- [ ] 权限状态变化时正确响应

## Technical Notes
- 使用 systemPreferences.getMediaAccessStatus
- 使用 systemPreferences.askForMediaAccess
- 遵循 macos-permissions.md 规范
