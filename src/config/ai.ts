import { GoogleGenAI, GenerateContentConfig } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// 1. Direct Google Gemini Engine (Ideation, QA Tester, Legal, SRE)
export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export const GEMINI_CASCADE = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
];

export async function generateWithGemini(params: {
  contents: string;
  config?: GenerateContentConfig;
}) {
  let lastError: any = null;
  for (const model of GEMINI_CASCADE) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response.text || "";
    } catch (err: any) {
      lastError = err;
      if (err.status === 503 || err.status === 429 || err.status === 404) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// 2. OpenRouter Multi-Model Gateway
export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:4000",
    "X-Title": "AI SaaS Factory",
  },
});

// Operations Manager (ChatGPT / o3 / GPT-4o-mini)
export async function runOperationsManager(prompt: string, system?: string) {
  const response = await openrouter.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0].message.content || "";
}

// Backend & Database Specialist (Kimi K3 / Moonshot)
export async function runBackendSpecialist(prompt: string, system?: string) {
  try {
    const response = await openrouter.chat.completions.create({
      model: "moonshotai/kimi-k3",
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content: prompt },
      ],
    });
    return response.choices[0].message.content || "";
  } catch (err) {
    console.warn("[Backend] K3 fallback to openrouter/auto...");
    const response = await openrouter.chat.completions.create({
      model: "openrouter/auto",
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content: prompt },
      ],
    });
    return response.choices[0].message.content || "";
  }
}

// Expert Coder (Claude Sonnet / Auto)
export async function runExpertCoder(prompt: string, system?: string) {
  const response = await openrouter.chat.completions.create({
    model: "openrouter/auto",
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0].message.content || "";
}

// Master Coder Reviewer (Claude / Auto)
export async function runMasterCoderReview(prompt: string, system?: string) {
  const response = await openrouter.chat.completions.create({
    model: "openrouter/auto",
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0].message.content || "";
}

// Sales & Marketing Specialist (Grok / GPT)
export async function runMarketingSpecialist(prompt: string, system?: string) {
  try {
    const response = await openrouter.chat.completions.create({
      model: "x-ai/grok-beta",
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content: prompt },
      ],
    });
    return response.choices[0].message.content || "";
  } catch (err) {
    console.warn("[Marketing] Grok fallback to gpt-4o-mini...");
    const response = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content: prompt },
      ],
    });
    return response.choices[0].message.content || "";
  }
}
