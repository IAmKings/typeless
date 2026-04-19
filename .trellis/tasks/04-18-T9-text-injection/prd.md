# T9: 文本注入（打字效果）

## 目标
实现"逐字打印效果" + "直接文本注入到焦点位置"

## 需求
1. **打字效果**：ASR 返回的文本按字符逐个显示，模拟真实打字
2. **文本注入**：文本直接插入到当前焦点位置（输入框等）

## 技术方案

### 1. 依赖
- `@xitanggg/node-insert-text` - 基于 CGEventKeyboardSetUnicodeString 的文本注入库

### 2. 文件修改

| 文件 | 修改内容 |
|------|---------|
| `package.json` | 添加 `@xitanggg/node-insert-text` 依赖 |
| `text.handler.ts` | 启用实际文本注入（移除占位符） |
| `floating.html` | 添加 transcript 显示区域 |
| `floating.ts` | 添加 onTranscript 监听 + 逐字打字动画 |

### 3. 数据流

```
ASR Final Transcript
    ↓
asr.handler.ts (Pipeline)
    ↓
text.handler.ts (injectText)
    ↓
@xitanggg/node-insert-text → 注入到焦点元素
    +
floating.ts (onTranscript 回调)
    ↓
逐字动画显示在浮窗中
```

### 4. 打字动画实现
- 逐字显示，每字符 30ms 延迟
- 最终 transcript 打字完成后，保持显示 3 秒后清空

## 验收标准
- [ ] 浮窗显示 ASR 转录文本
- [ ] 文本逐字打印效果（打字机效果）
- [ ] 文本成功注入到焦点输入框
- [ ] macOS 无障碍权限检查正确处理