import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const source = readFileSync(resolve(__dirname, "../useAgent.ts"), "utf8");

test("supplementFollowUp interrupts the running turn before resending", () => {
  // 补充当前问题 = 先优雅停止当前 run（复用取消链路），再立即把补充
  // 内容作为新消息发出：原问题与半截回答保留在历史，新一轮结合补充
  // 内容重新生成
  expect(source).toMatch(/const supplementFollowUp = useCallback/);
  expect(source).toMatch(/if \(!text\) return;/);
  expect(source).toMatch(
    /await stopGeneration\(\);\s*await sendMessageRef\.current\?\.\(text, attachments\);/,
  );
});

test("supplementFollowUp queues instead of racing an in-flight submission", () => {
  // 上一条 POST 仍在途时打断会造出同会话双发竞态，先排队到本轮结束后补发
  expect(source).toMatch(
    /if \(isSendingRef\.current\) \{[\s\S]*?queueFollowUp\(text, attachments\);[\s\S]*?return;\s*\}/,
  );
});
