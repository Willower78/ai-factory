import fs from "fs";
import path from "path";
import { runMarketingSpecialist } from "../config/ai";
import { PartitionedProject } from "./architect";

export async function runIsolatedMarketingAgent(project: PartitionedProject) {
  console.log("[Marketing Expert - Grok/GPT] Creating outreach copy & launch strategy...");
  const targetDir = path.join(process.cwd(), "output", "app");

  const audience = project.marketingPacket?.targetAudience || "Business owners";
  const painPoint = project.marketingPacket?.painPoint || "Operational inefficiencies";
  const valueProp = project.marketingPacket?.coreValueProp || "Automated streamlined workflow";

  const prompt = `Create a 3-touch cold email sequence and viral social launch hooks for:
Product: ${project.projectName || 'Micro SaaS'}
Target Audience: ${audience}
Pain Point: ${painPoint}
Core Value Proposition: ${valueProp}
Output clean Markdown only.`;

  const res = await runMarketingSpecialist(prompt, "You are a SaaS Growth Strategist.");
  const cleanDoc = res.replace(/^```markdown\s*/gi, "").replace(/```$/g, "").trim();
  fs.writeFileSync(path.join(targetDir, "MARKETING.md"), cleanDoc);
}
