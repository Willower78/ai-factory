import { generateWithGemini, generateWithClaude, generateWithOpenAI } from "./config/ai";

async function run() {
  console.log("1. Pinging Gemini API...");
  const g = await generateWithGemini({ contents: "Respond with 'Gemini OK'" });
  console.log("   ✅", g.trim());

  console.log("2. Pinging Claude 3.7 via OpenRouter...");
  const c = await generateWithClaude({ prompt: "Respond with 'Claude 3.7 OK'" });
  console.log("   ✅", c.trim());

  console.log("3. Pinging GPT-4o via OpenRouter...");
  const o = await generateWithOpenAI({ prompt: "Respond with 'GPT-4o OK'" });
  console.log("   ✅", o.trim());
}

run();
