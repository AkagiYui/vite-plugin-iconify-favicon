# vite-plugin-iconify-favicon

[![npm version](https://img.shields.io/npm/v/vite-plugin-iconify-favicon)](https://npmx.dev/package/vite-plugin-iconify-favicon)
[![npm downloads](https://img.shields.io/npm/dm/vite-plugin-iconify-favicon)](https://npmx.dev/package/vite-plugin-iconify-favicon)
[![npm license](https://img.shields.io/npm/l/vite-plugin-iconify-favicon)](https://npmx.dev/package/vite-plugin-iconify-favicon)

Vite 插件：从本地 `@iconify-json/*` 图标集提取图标，生成支持深色模式的 SVG favicon。构建时以 data URI 内联注入 `<head>`，无需在 `public/` 放置静态文件。

## 特性

- 自动扫描 `node_modules/@iconify-json/*` 中已安装的图标集
- 支持自定义图标（`prefix:name` 格式）和颜色
- 深色模式自动适配（通过 CSS 自定义属性 `--fv`）
- 构建时内联 data URI，零额外网络请求
- 自动移除已有的 `<link rel="icon">` 标签

## 安装

```bash
npm i -D vite-plugin-iconify-favicon @iconify-json/lucide
```

## 使用

```ts
// vite.config.ts
import { defineConfig } from "vite"
import faviconPlugin from "vite-plugin-iconify-favicon"

export default defineConfig({
  plugins: [
    faviconPlugin({ icon: "lucide:bot-message-square" }),
  ],
})
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `icon` | `string` | 自动检测 | 图标标识，格式 `prefix:name`；不传则取第一个包的第一个图标 |
| `lightColor` | `string` | `"#000000"` | 浅色模式颜色 |
| `darkColor` | `string` | `"#ffffff"` | 深色模式颜色 |

```ts
faviconPlugin({
  icon: "lucide:shield-check",
  lightColor: "#1a1a2e",
  darkColor: "#e0e0e0",
})
```

### icon 参数格式

| 写法 | 效果 |
|------|------|
| `"lucide:bot-message-square"` | 指定 @iconify-json/lucide 的 bot-message-square 图标 |
| `"bot-message-square"` | 仅指定图标名，包自动从已安装的 @iconify-json/* 中检测 |
| `"lucide:"` | 仅指定包前缀，图标取该包第一个 |
| 不传 | 取第一个已安装包的第一个图标 |

## License

MIT
