# T7: 悬浮窗口/状态栏 UI

## Goal
实现 macOS 语音输入应用的悬浮窗口和状态栏 UI，提供实时状态显示和快速操作入口。

## Requirements

### 1. 悬浮窗口
- **显示内容**：
  - 麦克风状态（idle/recording/processing）
  - ASR 连接状态（disconnected/connecting/connected/reconnecting/error）
  - 实时音频波形图
- **交互**：
  - 点击窗口：取消当前操作
  - 点击窗口外部：隐藏窗口
  - 状态栏点击：显示悬浮窗口
- **样式**：
  - 透明背景效果（毛玻璃）
  - 不固定位置（可拖拽或自由放置）
  - 自适应大小（根据内容）

### 2. 状态栏 (System Tray)
- **图标**：显示当前状态（空闲/录音中）
- **菜单**：
  - 显示/隐藏悬浮窗口
  - 快捷设置（修改三个 env 配置）：
    - AppKey
    - AccessKey
    - ResourceId
  - 退出应用

### 3. 状态同步
- 悬浮窗口实时反映麦克风和 ASR 服务状态
- 状态栏图标随应用状态变化

## Acceptance Criteria
- [ ] 悬浮窗口正确显示麦克风状态、ASR状态、音频波形
- [ ] 点击悬浮窗口触发取消操作
- [ ] 点击悬浮窗口外部隐藏窗口
- [ ] 状态栏图标正确显示
- [ ] 状态栏菜单可修改 AppKey/AccessKey/ResourceId
- [ ] 悬浮窗口具有透明/毛玻璃效果
- [ ] 悬浮窗口位置不固定，可自由放置
- [ ] 悬浮窗口大小自适应内容

## Technical Notes
- 使用 Electron BrowserWindow 创建悬浮窗口
- 使用 Electron Tray 创建状态栏图标
- 使用 `@electron-forge/cli` 构建
- IPC 通道：`floatingWindow:*`, `tray:*`
- 遵循 `frontend/ipc-electron.md` 中的 Floating Window Pattern
