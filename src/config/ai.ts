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
  timeout: 35000, // 35-second hard client timeout
  defaultHeaders: {
    "HTTP-Referer": "https://render.com",
    "X-Title": "AI Factory Cockpit",
  },
});

export const openrouter = openRouter;

async function completePromptWithTimeout(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7
): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }
  messages.push({ role: "user", content: prompt });

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${model} took longer than 35s`)), 35000)
  );

  const apiCallPromise = (async () => {
    const completion = await openRouter.chat.completions.create({
      model,
      messages,
      temperature,
    });
    return completion.choices[0]?.message?.content || "";
  })();

  return Promise.race([apiCallPromise, timeoutPromise]);
}

// 1. Unified Gemini Runner
export async function generateWithGemini(params: {
  contents?: string;
  prompt?: string;
  config?: { temperature?: number; systemInstruction?: string };
}) {
  const promptText = params.contents || params.prompt || "";
  const systemText = params.config?.systemInstruction;
  const temp = params.config?.temperature ?? 0.7;

  try {
    const text = await completePromptWithTimeout(
      "google/gemini-2.5-flash",
      promptText,
      systemText,
      temp
    );
    return { text };
  } catch (err) {
    console.warn("[Gemini API Warning] Falling back to fast response:", err);
    return { text: "" };
  }
}

// 2. Claude Runner (Lead Coder & Code Reviewer)
export async function generateWithClaude(params: {
  prompt: string;
  system?: string;
  temperature?: number;
}) {
  try {
    const text = await completePromptWithTimeout(
      "anthropic/claude-3.7-sonnet",
      params.prompt,
      params.system,
      params.temperature ?? 0.5
    );
    return { text };
  } catch (err) {
    console.warn("[Claude API Warning] Falling back to secondary fast model:", err);
    try {
      const fallbackText = await completePromptWithTimeout(
        "google/gemini-2.5-flash",
        params.prompt,
        params.system,
        0.5
      );
      return { text: fallbackText };
    } catch (fallbackErr) {
      console.error("[Fatal AI Error]", fallbackErr);
      return { text: "" };
    }
  }
}

// Specialist runner mappings
export async function runIdeationAgent(prompt: string, system?: string) {
  const res = await generateWithGemini({ prompt, config: { systemInstruction: system } });
  return res.text;
}

export async function runBackendSpecialist(prompt: string, system?: string) {
  try {
    return await completePromptWithTimeout("moonshotai/kimi-k2-chat", prompt, system, 0.3);
  } catch {
    const res = await generateWithGemini({ prompt, config: { systemInstruction: system } });
    return res.text;
  }
}

export async function runExpertCoder(prompt: string, system?: string) {
  const res = await generateWithClaude({ prompt, system, temperature: 0.3 });
  return res.text;
}

export async function runMasterCoderReview(prompt: string, system?: string) {
  const res = await generateWithClaude({ prompt, system, temperature: 0.2 });
  return res.text;
}
