import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey =
  process.env.OPENROUTER_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "sk-dummy-startup-key";

export const openRouter = new OpenAI({
  apiKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://render.com",
    "X-Title": "AI Factory Cockpit",
  },
});

export const openrouter = openRouter;

async function completePrompt(model: string, prompt: string, system?: string, temperature = 0.7) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await openRouter.chat.completions.create({
    model,
    messages,
    temperature,
  });

  return completion.choices[0]?.message?.content || "";
}

// 1. Unified Gemini Runner (used by ideation, tester, legal, monitor)
export async function generateWithGemini(params: {
  contents?: string;
  prompt?: string;
  config?: { temperature?: number; systemInstruction?: string };
}) {
  const promptText = params.contents || params.prompt || "";
  const systemText = params.config?.systemInstruction;
  const temp = params.config?.temperature ?? 0.7;

  const text = await completePrompt("google/gemini-2.5-flash", promptText, systemText, temp);
  return { text };
}

// 2. Claude Runner
export async function generateWithClaude(params: {
  prompt: string;
  system?: string;
  temperature?: number;
}) {
  const text = await completePrompt(
    "anthropic/claude-3.7-sonnet",
    params.prompt,
    params.system,
    params.temperature ?? 0.7
  );
  return { text };
}

// 3. OpenAI Runner
export async function generateWithOpenAI(params: {
  prompt: string;
  system?: string;
  temperature?: number;
}) {
  const text = await completePrompt(
    "openai/gpt-4o",
    params.prompt,
    params.system,
    params.temperature ?? 0.7
  );
  return { text };
}

// 4. Operations Manager
export async function runOperationsManager(prompt: string, system?: string) {
  return completePrompt("openai/gpt-4o-mini", prompt, system);
}

// 5. Backend & Database Specialist
export async function runBackendSpecialist(prompt: string, system?: string) {
  try {
    return await completePrompt("moonshotai/kimi-k3", prompt, system);
  } catch {
    return completePrompt("openrouter/auto", prompt, system);
  }
}

// 6. Expert Coder & Master Reviewer
export async function runExpertCoder(prompt: string, system?: string) {
  return completePrompt("openrouter/auto", prompt, system);
}

export async function runMasterCoderReview(prompt: string, system?: string) {
  return completePrompt("openrouter/auto", prompt, system);
}

// 7. Marketing Specialist
export async function runMarketingSpecialist(prompt: string, system?: string) {
  try {
    return await completePrompt("x-ai/grok-beta", prompt, system);
  } catch {
    return completePrompt("openai/gpt-4o-mini", prompt, system);
  }
}
