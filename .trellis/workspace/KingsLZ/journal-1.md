# Journal - KingsLZ (Part 1)

> AI development session journal
> Started: 2026-04-18

---



## Session 1: 初始化 Electron 项目并完成 Trellis onboarding

**Date**: 2026-04-18
**Task**: 初始化 Electron 项目并完成 Trellis onboarding
**Branch**: `master`

### Summary

完成项目初始化和 Trellis 工作流 onboarding

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b7dce4a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: T3 IPC 通道设计完成

**Date**: 2026-04-18
**Task**: T3 IPC 通道设计完成
**Branch**: `master`

### Summary

实现语音输入应用 IPC 通道架构

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5602a4b` | (see git log) |
| `13864c4` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: T1 音频采集模块实现完成

**Date**: 2026-04-18
**Task**: T1 音频采集模块实现完成
**Branch**: `master`

### Summary

实现 macOS 语音输入应用的音频采集模块。使用 getUserMedia + AudioContext 在渲染进程实现实时音频采集，输出 PCM 16kHz/16bit/mono 格式。支持设备枚举、音量监测（50ms）、音频数据推送（100ms）、设备切换。添加测试 UI 页面。修复 package.json 中 electron 依赖位置问题。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c0beb93` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: T2 WebSocket 客户端封装完成

**Date**: 2026-04-18
**Task**: T2 WebSocket 客户端封装完成
**Branch**: `master`

### Summary

实现 ASR WebSocket 客户端模块。使用 ws 库连接火山引擎 ASR 服务器，实现 connect/disconnect/sendAudio 方法，添加自动重连机制（最多 3 次）。新增 asr.service.ts、codec.ts 编解码器、types.ts 类型定义。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1354140` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: T4 火山引擎 ASR API 集成完成

**Date**: 2026-04-19
**Task**: T4 火山引擎 ASR API 集成完成
**Branch**: `master`

### Summary

完成 ASR REST API 集成、环境配置加载器、UI 状态显示。新增 api.ts 实现 validateConfig/healthCheck，新增 config.ts 从 .env 读取配置，更新 index.html 添加 ASR 状态指示器和 Connect/Disconnect 按钮。添加 README.md 项目文档。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `05b2aec` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: T5 语音输入→文本输出管道 + GitHub Actions

**Date**: 2026-04-19
**Task**: T5 语音输入→文本输出管道 + GitHub Actions
**Branch**: `master`

### Summary

实现语音输入到文本输出的自动管道连接，ASR 转写结果自动触发文本注入；添加 GitHub Actions CI/CD 自动打包脚本

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `cc15233` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: T6 全局快捷键触发实现

**Date**: 2026-04-19
**Task**: T6 全局快捷键触发实现
**Branch**: `master`

### Summary

完善全局快捷键模块，添加 macOS Accessibility 权限检查、快捷键重复注册检测、结构化错误返回

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4ef0eaa` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: T7-ui 悬浮窗口完成 + Tray Bug 修复

**Date**: 2026-04-19
**Task**: T7-ui 悬浮窗口完成 + Tray Bug 修复
**Branch**: `master`

### Summary

(Add summary)

### Main Changes

## 本次 Session 完成内容

### T7-ui 悬浮窗口/状态栏 UI
- 实现悬浮窗口 UI（麦克风状态、ASR状态、音频波形）
- 实现系统托盘（状态栏图标、设置菜单）
- 点击外部自动隐藏悬浮窗口
- 透明毛玻璃效果

### Tray Icon Bug 修复
- 修复状态栏图标不显示问题
- 使用真实的 18x18 PNG 图标替换无效的 base64 data URL
- 添加 extraResource 配置确保 assets 被正确打包

### CI 修复
- 修复 GitHub workflow pnpm 安装问题（使用 corepack）

## 待完成任务
- T8-settings: 设置页面
- T9-text-injection: 文本注入
- T12-i18n: 国际化支持


### Git Commits

| Hash | Message |
|------|---------|
| `68c3174` | (see git log) |
| `3bfb391` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
