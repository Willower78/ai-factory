import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";

export const openRouter = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://render.com",
    "X-Title": "AI Factory Cockpit",
  },
});

export async function generateWithGemini(params: {
  contents?: string;
  prompt?: string;
  config?: { temperature?: number; systemInstruction?: string };
}) {
  const promptText = params.contents || params.prompt || "";
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (params.config?.systemInstruction) {
    messages.push({ role: "system", content: params.config.systemInstruction });
  }
  messages.push({ role: "user", content: promptText });

  const completion = await openRouter.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages,
    temperature: params.config?.temperature ?? 0.7,
  });

  return {
    text: completion.choices[0]?.message?.content || "",
  };
}

export async function generateWithClaude(params: {
  prompt: string;
  system?: string;
  temperature?: number;
}) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  messages.push({ role: "user", content: params.prompt });

  const completion = await openRouter.chat.completions.create({
    model: "anthropic/claude-3.7-sonnet",
    messages,
    temperature: params.temperature ?? 0.7,
  });

  return {
    text: completion.choices[0]?.message?.content || "",
  };
}

export async function generateWithOpenAI(params: {
  prompt: string;
  system?: string;
  temperature?: number;
}) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  messages.push({ role: "user", content: params.prompt });

  const completion = await openRouter.chat.completions.create({
    model: "openai/gpt-4o",
    messages,
    temperature: params.temperature ?? 0.7,
  });

  return {
    text: completion.choices[0]?.message?.content || "",
  };
}
