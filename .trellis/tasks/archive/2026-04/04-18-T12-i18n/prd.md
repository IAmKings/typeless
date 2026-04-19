# T12: 国际化支持

## 目标
实现完整的中英文国际化支持，用户可在设置中选择语言

## 需求
1. 浮窗状态文字支持中英文
2. 设置页面支持中英文
3. 托盘菜单支持中英文
4. 语言设置持久化到 .env

## 技术方案

### 架构
- 使用简单的 JSON 语言文件 + TypeScript 工具函数
- 不依赖 React i18n（项目使用原生 HTML）
- 语言文件：`src/i18n/{locale}.json`
- 工具函数：`src/i18n/index.ts`
- 语言偏好通过 `language` 设置字段持久化

### 文件结构
```
src/i18n/
├── index.ts           # i18n 工具函数
├── en.json           # 英文翻译
└── zh-CN.json        # 中文翻译
```

### 需要翻译的字符串

| 文件 | 字符串数量 |
|------|-----------|
| floating.html | 8 |
| floating.ts | 11 |
| settings.html | 10 |
| tray.handler.ts | 9 |
| settings-dialog.handler.ts | 2 |
| 其他 (index.html, audio.handler.ts, etc) | ~30+ |

### 实现步骤

1. 创建 `src/i18n/` 目录和语言文件
2. 创建 `i18n/index.ts` 工具函数
3. 创建 `src/i18n/renderer.ts` 用于渲染进程翻译
4. 更新 floating.html 添加语言切换
5. 更新 floating.ts 使用翻译函数
6. 更新 settings.html 使用翻译函数
7. 更新 tray handler 使用翻译函数
8. 添加语言切换设置项

### 数据流
```
用户选择语言
    ↓
settings.html → IPC: settings:set("language", "zh-CN")
    ↓
settings.handler.ts → 保存到 .env
    ↓
重启后读取 .env → 应用语言
```

## 验收标准
- [ ] 中英文切换正常工作
- [ ] 浮窗所有状态文字已翻译
- [ ] 设置页面所有文字已翻译
- [ ] 托盘菜单所有文字已翻译
- [ ] 语言设置持久化生效