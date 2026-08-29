import { generateWithGemini } from "../config/ai";

export interface IdeaItem {
  id: string;
  title: string;
  tagline: string;
  niche: string;
  tier: string;
  problem: string;
  solution: string;
  targetAudience: string;
  mrrPotential: string;
  buildComplexity: "Low" | "Medium" | "High";
}

const fallbackIdeas: IdeaItem[] = [
  {
    id: "idea-1",
    title: "LeadPulse AI",
    tagline: "AI sales intelligence engine generating custom prospect dossiers in seconds.",
    niche: "B2B Sales Automation",
    tier: "$15K MRR Potential",
    problem: "Outreach personalization takes too much manual research time.",
    solution: "Generates bespoke pitch decks and dynamic dossiers per prospect.",
    targetAudience: "B2B Sales Reps & Agency Owners",
    mrrPotential: "$8k - $20k / mo",
    buildComplexity: "Low"
  },
  {
    id: "idea-2",
    title: "StaffFlow SOP",
    tagline: "Voice-to-SOP engine that turns speech into step-by-step checklists.",
    niche: "Operations Management",
    tier: "$12K MRR Potential",
    problem: "Documenting internal business processes and checklists is tedious.",
    solution: "Voice-to-SOP engine that turns speech into step-by-step checklists.",
    targetAudience: "Agencies and Small Businesses",
    mrrPotential: "$5k - $14k / mo",
    buildComplexity: "Low"
  },
  {
    id: "idea-3",
    title: "ReviewVault AI",
    tagline: "Reputation automation with smart multi-platform contextual response drafts.",
    niche: "Local Business Reputation",
    tier: "$18K MRR Potential",
    problem: "Multi-location venues miss critical customer feedback and replies.",
    solution: "Aggregates Google/Yelp reviews and automates context-aware responses.",
    targetAudience: "Salons, Clinics, and Restaurants",
    mrrPotential: "$6k - $18k / mo",
    buildComplexity: "Medium"
  }
];

export async function scanMarket(focus?: string): Promise<IdeaItem[]> {
  const prompt = `You are a high-speed SaaS market researcher.
Generate 4 high-ROI micro-SaaS product ideas. ${focus ? `Focus on: "${focus}"` : ""}

Respond ONLY with a valid JSON array of objects. No markdown backticks, no explanations.
Format:
[
  {
    "id": "idea-1",
    "title": "LeadPulse AI",
    "tagline": "Short punchy one-sentence value proposition",
    "niche": "Target Niche",
    "tier": "High Value",
    "problem": "Core problem solved",
    "solution": "Key SaaS solution",
    "targetAudience": "Target audience",
    "mrrPotential": "$5k - $15k / mo",
    "buildComplexity": "Low"
  }
]`;

  try {
    const res = await generateWithGemini({ prompt, config: { temperature: 0.7 } });
    let text = (res.text || "").trim();
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    if (text) {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : (parsed.ideas || []);
      if (items.length > 0) {
        return items.map((item: any, idx: number) => ({
          id: item.id || `idea-${idx + 1}`,
          title: item.title || item.name || "Micro SaaS Product",
          tagline: item.tagline || item.solution || item.problem || "",
          niche: item.niche || "B2B SaaS",
          tier: item.tier || item.mrrPotential || "Micro-SaaS",
          problem: item.problem || "",
          solution: item.solution || "",
          targetAudience: item.targetAudience || "",
          mrrPotential: item.mrrPotential || "$5k - $15k / mo",
          buildComplexity: item.buildComplexity || "Low"
        }));
      }
    }
  } catch (err: any) {
    console.error("[Ideation Agent OpenRouter Log]:", err?.message || err);
  }

  return fallbackIdeas;
}
