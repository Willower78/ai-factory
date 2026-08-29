import fs from "fs";
import path from "path";
import { generateWithGemini } from "../config/ai";
import { PartitionedProject } from "./architect";

export async function runIsolatedTesterAgent(project: PartitionedProject) {
  console.log("[QA Tester - Gemini] Generating Playwright E2E suite...");
  const targetDir = path.join(process.cwd(), "output", "app", "tests");
  fs.mkdirSync(targetDir, { recursive: true });

  const journeys = project.qaPacket?.userJourneysToTest || ["User dashboard navigation", "Primary record creation flow"];

  const prompt = `Write a Playwright E2E test suite (e2e.spec.ts) for:
App: ${project.projectName || 'Micro SaaS'}
User Journeys:
${JSON.stringify(journeys, null, 2)}
Output valid TypeScript test code only inside a markdown code block.`;

  const res = await generateWithGemini({ contents: prompt, config: { temperature: 0.1 } });
  const rawText = typeof res === "string" ? res : (res?.text || "");
  const cleanCode = rawText.replace(/```tsx?\s*/gi, "").replace(/```/g, "").trim();
  fs.writeFileSync(path.join(targetDir, "e2e.spec.ts"), cleanCode);
}
