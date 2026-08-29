import fs from "fs";
import path from "path";
import { generateWithGemini } from "../config/ai";
import { Blueprint } from "./architect";

export async function runMonitorAgent(blueprint: Blueprint) {
  console.log(`\n=== STEP 6: Running Autonomous Production Monitor & Health Auditor ===`);
  const targetDir = path.join(process.cwd(), "output", "app");

  const prompt = `You are a Site Reliability Engineer (SRE).
Evaluate application architecture, identify potential runtime risks, and propose 2-3 high-ROI improvements for "${blueprint.projectName}".
Output ONLY raw JSON.`;

  const res = await generateWithGemini({
    contents: prompt,
    config: { temperature: 0.2 },
  });

  const clean = res.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  fs.writeFileSync(path.join(targetDir, "HEALTH_AUDIT.json"), clean);
  console.log("-> Saved: output/app/HEALTH_AUDIT.json");
}
