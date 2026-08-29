import fs from "fs";
import path from "path";
import { runIdeationAgent } from "./agents/ideation";
import { runArchitectAgent } from "./agents/architect";
import { runCoderAgent } from "./agents/coder";
import { runTesterAgent } from "./agents/tester";
import { runLegalAgent } from "./agents/legal";
import { runMarketingAgent } from "./agents/marketing";
import { runMonitorAgent } from "./agents/monitor";
import { runExpansionAgents } from "./agents/expansion";
import { promptUserForConcept } from "./ui/selector";
import { scaffoldNextProject } from "./generators/scaffolder";
import { generateDeployScript } from "./deploy/deployer";
import { startLivePreview } from "./preview/runner";

async function runMasterPipeline() {
  console.log("=================================================");
  console.log("🏭 STARTING MASTER AUTONOMOUS MICRO-SAAS FACTORY");
  console.log("=================================================");

  const ideationData = await runIdeationAgent("local sports clubs, coaching clinics, and venue booking");
  const selectedConcept = await promptUserForConcept(ideationData.ideas);

  console.log("\n=== STEP 1: Running Architect / PM Agent ===");
  const blueprint = await runArchitectAgent(selectedConcept);
  fs.writeFileSync(path.join(process.cwd(), "output", "blueprint.json"), JSON.stringify(blueprint, null, 2));

  await runCoderAgent(blueprint);
  scaffoldNextProject(blueprint);
  await runExpansionAgents(blueprint);
  await runTesterAgent(blueprint);
  await runLegalAgent(blueprint);
  await runMarketingAgent(blueprint);
  await runMonitorAgent(blueprint);
  generateDeployScript(blueprint.projectName);

  console.log("\n=================================================");
  console.log("🎉 BUILD COMPLETE! LAUNCHING LIVE PREVIEW...");
  console.log("=================================================");

  await startLivePreview();
}

runMasterPipeline().catch((err) => {
  console.error("Pipeline failed:", err);
});
