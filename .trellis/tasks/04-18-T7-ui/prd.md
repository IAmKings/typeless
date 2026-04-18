# T7: 悬浮窗口/状态栏 UI

## Goal
实现 macOS 应用的悬浮窗口和菜单栏状态栏 UI。

## Requirements
- 悬浮窗口：简洁的浮动 UI，显示录音状态和转写结果
- 菜单栏图标：显示应用状态，点击显示菜单
- 窗口交互：支持拖拽、点击交互

## Acceptance Criteria
- [ ] 悬浮窗口可以显示/隐藏
- [ ] 菜单栏显示应用状态图标
- [ ] 录音状态实时显示在 UI 上
- [ ] 点击悬浮窗口触发交互

## Technical Notes
- 使用 Electron BrowserWindow 实现悬浮窗口
- 使用 Electron Menu 实现菜单栏
- 遵循 frontend guidelines
