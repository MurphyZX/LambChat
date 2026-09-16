import { readFileSync } from "node:fs";
import { join } from "node:path";

// 护眼（sepia）主题只覆盖 --theme-* CSS 变量：theme-* 工具类随之变暖，
// 硬编码的 stone/white/red 亮色类不会适配，导致米黄底上出现冷灰色块
// （proto/profile-sepia-variants 分支原型评审结论，方案 A：纯 token 替换）。
// 本测试守护个人信息模块的两个文件：剥掉 dark: 前缀变体后，
// 浅色路径不得再出现硬编码中性色/红色工具类。

const sources = {
  "ProfileModal.tsx": readFileSync(
    join(import.meta.dirname, "../ProfileModal.tsx"),
    "utf8",
  ),
  "ProfileInfoTab.tsx": readFileSync(
    join(import.meta.dirname, "../tabs/ProfileInfoTab.tsx"),
    "utf8",
  ),
};

/** 去掉所有 dark: 前缀的工具类段（含 hover:dark: 等组合），只留浅色路径 */
function stripDarkVariants(source: string): string {
  return source.replace(/(?:[a-zA-Z-]+:)*dark:[^\s"'`{}]+/g, "");
}

const BANNED_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "stone-*", pattern: /(?:bg|text|border|ring|from|to|via)-stone-\d/ },
  { name: "border-white", pattern: /\bborder-white\b/ },
  { name: "red-*", pattern: /(?:bg|text|border|ring)-(?:red|rose)-\d/ },
];

test.each(Object.entries(sources))(
  "%s 浅色路径不依赖硬编码中性色/红色（护眼模式视觉统一）",
  (filename, source) => {
    const lightPath = stripDarkVariants(source);
    for (const { name, pattern } of BANNED_PATTERNS) {
      const match = lightPath.match(pattern);
      expect(
        match,
        `${filename} 浅色路径出现硬编码 ${name}（"${match?.[0]}"），` +
          `请改用 theme-* token 以适配护眼模式`,
      ).toBeNull();
    }
  },
);
