import { generateWithGemini } from "../config/ai";

export interface SaaSConcept {
  title: string;
  tagline: string;
  tier: "fast" | "advanced";
  industry: string;
  targetAudience: string;
  painPoint: string;
  mvpFeatures: string[];
  monetization: string;
  estimatedBuildDays: number;
}

export interface IdeationResponse {
  date: string;
  ideas: SaaSConcept[];
}

export async function runIdeationAgent(focusSector?: string): Promise<IdeationResponse> {
  console.log(`[Ideation Agent - Gemini] Scanning global high-intent SaaS opportunities across all industries...`);
  
  const sectorPrompt = focusSector && focusSector.trim() !== ""
    ? `Specific focus requested: "${focusSector}".`
    : `Explore diverse, high-margin industries with pressing digital workflow bottlenecks (e.g. trades & field services, clinic admin, property management, compliance automation, logistics dispatch, B2B wholesale, niche professional services).`;

  const systemInstruction = `You are an elite Market Research & Micro-SaaS Product Strategist.
Identify clear, underserved gaps across any industry where a focused software tool solves an immediate operational pain point.
Generate exactly 10 distinct concepts:
- 8 'fast' tier (laser-focused MVP buildable in 1-2 days).
- 2 'advanced' tier (richer automation or multi-sided workflow buildable in 3-5 days).

Ensure high industry diversity across the 10 ideas.
Output ONLY raw JSON matching this schema:
{
  "date": "YYYY-MM-DD",
  "ideas": [
    {
      "title": "string",
      "tagline": "string",
      "tier": "fast",
      "industry": "string",
      "targetAudience": "string",
      "painPoint": "string",
      "mvpFeatures": ["feature 1", "feature 2", "feature 3"],
      "monetization": "string",
      "estimatedBuildDays": 2
    }
  ]
}`;

  const rawRes = await generateWithGemini({
    contents: `Generate 10 high-demand, monetization-ready micro-SaaS concepts across diverse industries. ${sectorPrompt}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  });

  const clean = rawRes.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  return JSON.parse(clean) as IdeationResponse;
}
