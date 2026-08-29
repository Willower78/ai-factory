import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import { generateWithGemini } from "../config/ai";
import { Blueprint } from "./architect";

export async function runExpansionAgents(blueprint: Blueprint) {
  console.log("\n=== STEP X: Running Expansion & Localization Modules ===");
  const targetDir = path.join(process.cwd(), "output", "app");

  const { langChoice } = await inquirer.prompt([
    {
      type: "select",
      name: "langChoice",
      message: "Do you want to add localization (languages other than English)?",
      choices: [
        { name: "English only (Default)", value: "en" },
        { name: "Swedish (Svenska)", value: "sv" },
        { name: "Spanish (Español)", value: "es" },
        { name: "German (Deutsch)", value: "de" },
      ],
    },
  ]);

  if (langChoice !== "en") {
    console.log(`[Localization] Injecting ${langChoice} dictionary and language switcher...`);
    fs.mkdirSync(path.join(targetDir, "locales"), { recursive: true });
    
    const i18nPrompt = `You are a Senior Frontend Engineer. Create a lightweight JSON dictionary file ('${langChoice}.json') for translations of the app "${blueprint.projectName}" with common UI labels and keys. Output ONLY raw JSON.`;
    const res = await generateWithGemini({ contents: i18nPrompt });
    const cleanJson = res.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    fs.writeFileSync(path.join(targetDir, "locales", `${langChoice}.json`), cleanJson);
    console.log(`-> Saved: output/app/locales/${langChoice}.json`);
  }

  console.log("[Stripe Agent] Auto-wiring Stripe Checkout API routes...");
  fs.mkdirSync(path.join(targetDir, "app", "api", "checkout"), { recursive: true });
  
  const stripeRouteCode = `import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json();
    return NextResponse.json({ 
      url: \`https://checkout.stripe.com/pay/mock_session_\${Math.random().toString(36).substring(7)}\`,
      status: "success" 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(targetDir, "app", "api", "checkout", "route.ts"), stripeRouteCode);
  console.log("-> Saved: output/app/app/api/checkout/route.ts");
}
