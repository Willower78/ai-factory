import fs from "fs";
import path from "path";
import { generateWithGemini } from "../config/ai";
import { PartitionedProject } from "./architect";

export async function runIsolatedLegalAgent(project: PartitionedProject) {
  console.log("[Legal Specialist - Gemini] Generating GDPR & Terms policies...");
  const targetDir = path.join(process.cwd(), "output", "app");

  const dataCollected = project.legalPacket?.dataCollected || ["User email", "Usage analytics"];
  const hasPayments = project.legalPacket?.hasPayments ?? true;

  const prompt = `Draft GDPR Privacy Policy and Terms of Service for:
App: ${project.projectName || 'Micro SaaS'}
Data Collected: ${JSON.stringify(dataCollected, null, 2)}
Accepts Payments: ${hasPayments}
Output clean Markdown only.`;

  const res = await generateWithGemini({ contents: prompt, config: { temperature: 0.2 } });
  const cleanDoc = res.replace(/^```markdown\s*/gi, "").replace(/```$/g, "").trim();
  fs.writeFileSync(path.join(targetDir, "LEGAL.md"), cleanDoc);
}
