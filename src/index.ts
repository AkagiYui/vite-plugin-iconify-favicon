/**
 * vite-plugin-iconify-favicon
 *
 * 从本地 @iconify-json/* 图标集提取图标，生成支持深色模式的 SVG favicon。
 * 构建时以 data URI 内联注入 <head>，无需在 public/ 放置静态文件。
 *
 * 默认行为：自动扫描 node_modules 中已安装的 @iconify-json 包，取第一个包的第一个图标。
 *
 * @example
 * // 使用默认（自动检测）
 * faviconPlugin()
 *
 * @example
 * // 指定图标（prefix:name 格式）
 * faviconPlugin({ icon: 'lucide:bot-message-square' })
 *
 * @example
 * // 仅指定图标名，包前缀自动检测
 * faviconPlugin({ icon: 'bot-message-square' })
 *
 * @example
 * // 仅指定包前缀，图标自动取第一个
 * faviconPlugin({ icon: 'radix-icons:' })
 */

import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

// ---------------------------------------------------------------------------
// 类型定义（内联 Vite Plugin 类型，避免 link 安装时版本冲突）
// ---------------------------------------------------------------------------

/** Vite Plugin 最小接口 */
interface VitePlugin {
  name: string
  configResolved?: () => void
  transformIndexHtml?: (html: string) => string
}

/** 插件配置选项 */
export interface FaviconPluginOptions {
  /**
   * 图标标识，格式为 'prefix:name'（与 Iconify 一致）。
   * - `'lucide:bot-message-square'` → 指定包和图标
   * - `'bot-message-square'` → 仅指定图标名，包自动检测
   * - `'lucide:'` → 仅指定包，图标取第一个
   * - 不传 → 完全自动检测
   */
  icon?: string
  /** 浅色模式颜色，默认 '#000000' */
  lightColor?: string
  /** 深色模式颜色，默认 '#ffffff' */
  darkColor?: string
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

/** 生成完整 SVG 字符串 */
function buildSvg(
  body: string,
  width: number,
  height: number,
  lightColor: string,
  darkColor: string,
): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none"`,
    ' stroke="var(--fv)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    "<style>",
    `:root{--fv:${lightColor}}`,
    `@media (prefers-color-scheme:dark){:root{--fv:${darkColor}}}`,
    "</style>",
    body,
    "</svg>",
  ].join("")
}

/** 扫描 node_modules/@iconify-json 目录，返回已安装的包名列表 */
function findIconifyPackages(cwd: string): string[] {
  const dir = resolve(cwd, "node_modules/@iconify-json")
  try {
    return readdirSync(dir, { withFileTypes: true })
      // pnpm 等包管理器使用符号链接组织 node_modules，Dirent.isDirectory() 对符号链接返回 false，需一并放行
      .filter(d => d.isDirectory() || d.isSymbolicLink())
      .map(d => d.name)
  } catch {
    return []
  }
}

interface IconSetData {
  width?: number
  height?: number
  icons: Record<string, { body: string }>
}

/** 加载指定 iconify 包的 icons.json */
function loadIconSet(cwd: string, pkg: string): IconSetData | null {
  const path = resolve(cwd, "node_modules/@iconify-json", pkg, "icons.json")
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as IconSetData
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 插件实现
// ---------------------------------------------------------------------------

/**
 * 创建 vite-plugin-iconify-favicon 插件实例。
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import faviconPlugin from "vite-plugin-iconify-favicon"
 *
 * export default defineConfig({
 *   plugins: [faviconPlugin({ icon: "lucide:bot-message-square" })],
 * })
 * ```
 */
export default function faviconPlugin(
  rawOptions: FaviconPluginOptions = {},
): VitePlugin {
  const {
    lightColor = "#000000",
    darkColor = "#ffffff",
  } = rawOptions

  // 解析 'prefix:name' 格式（与 Iconify 用法一致）
  let prefix: string | undefined
  let icon: string | undefined
  if (rawOptions.icon) {
    const colonIndex = rawOptions.icon.indexOf(":")
    if (colonIndex === -1) {
      // 'bot-message-square' → 仅指定图标名
      icon = rawOptions.icon
    } else {
      // 'lucide:bot-message-square' 或 'lucide:' 或 ':bot-message-square'
      prefix = rawOptions.icon.slice(0, colonIndex) || undefined
      icon = rawOptions.icon.slice(colonIndex + 1) || undefined
    }
  }

  let dataUri = ""

  return {
    name: "vite-plugin-favicon",

    configResolved() {
      const cwd = process.cwd()
      const packages = findIconifyPackages(cwd)

      if (packages.length === 0) {
        throw new Error(
          "[vite-plugin-favicon] 未找到任何 @iconify-json/* 包，请先安装（如 @iconify-json/lucide）",
        )
      }

      // 确定使用的包
      if (!prefix) {
        prefix = packages[0]!
      } else if (!packages.includes(prefix)) {
        throw new Error(
          `[vite-plugin-favicon] @iconify-json/${prefix} 未安装，可用: ${packages.join(", ")}`,
        )
      }

      // 加载图标集数据
      const iconSet = loadIconSet(cwd, prefix)
      if (!iconSet) {
        throw new Error(
          `[vite-plugin-favicon] 无法加载 @iconify-json/${prefix} 的图标数据`,
        )
      }

      // 确定使用的图标
      const iconNames = Object.keys(iconSet.icons)
      if (iconNames.length === 0) {
        throw new Error(
          `[vite-plugin-favicon] @iconify-json/${prefix} 中没有图标`,
        )
      }

      if (!icon) {
        icon = iconNames[0]!
      } else if (!iconSet.icons[icon]) {
        throw new Error(
          `[vite-plugin-favicon] 图标 "${icon}" 在 @iconify-json/${prefix} 中不存在`,
        )
      }

      const iconData = iconSet.icons[icon]!
      const w = iconSet.width || 24
      const h = iconSet.height || 24
      const svg = buildSvg(iconData.body, w, h, lightColor, darkColor)
      dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`

      console.log(
        `[vite-plugin-favicon] ${prefix}:${icon}  (light: ${lightColor} / dark: ${darkColor})`,
      )
    },

    transformIndexHtml(html) {
      let result = html.replace(
        /<link[^>]*\brel=["'](?:icon|alternate icon|shortcut icon)["'][^>]*\/?>\s*/gi,
        "",
      )
      result = result.replace(
        "</head>",
        `  <link rel="icon" type="image/svg+xml" href="${dataUri}">\n  </head>`,
      )
      return result
    },
  }
}
