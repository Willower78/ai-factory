import inquirer from "inquirer";
import { SaaSConcept } from "../agents/ideation";

export async function promptUserForConcept(ideas: SaaSConcept[]): Promise<SaaSConcept> {
  console.log("\n=================================================");
  console.log("📋 DAILY MICRO-SAAS OPPORTUNITY SELECTION");
  console.log("=================================================\n");

  const choices = ideas.map((idea, index) => ({
    name: `[${idea.tier.toUpperCase()}]${idea.title.padEnd(20)} | ${idea.tagline} (${idea.estimatedBuildDays}d build)`,
    value: index,
  }));

  const { selectedIndex } = await inquirer.prompt([
    {
      type: "select",
      name: "selectedIndex",
      message: "Select an opportunity to architect and build today:",
      choices,
      pageSize: 10,
    },
  ]);

  const chosen = ideas[selectedIndex];
  console.log(`\nSelected: "${chosen.title}"`);
  console.log(`Audience: ${chosen.targetAudience}`);
  console.log(`Pain Point: ${chosen.painPoint}`);
  console.log(`Monetization: ${chosen.monetization}\n`);

  return chosen;
}
