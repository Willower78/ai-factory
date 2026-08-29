import { generateWithGemini } from "../config/ai";

export interface IdeaItem {
  id: string;
  name: string;
  niche: string;
  problem: string;
  solution: string;
  targetAudience: string;
  mrrPotential: string;
  buildComplexity: "Low" | "Medium" | "High";
}

const fallbackIdeas: IdeaItem[] = [
  {
    id: "idea-1",
    name: "LeadPulse AI",
    niche: "B2B Sales Automation",
    problem: "Outreach personalization takes too much manual research time.",
    solution: "Generates bespoke pitch decks and dynamic dossiers per prospect.",
    targetAudience: "B2B Sales Reps & Agency Owners",
    mrrPotential: "$8k - $20k / mo",
    buildComplexity: "Low"
  },
  {
    id: "idea-2",
    name: "StaffFlow SOP",
    niche: "Operations Management",
    problem: "Documenting internal business processes and checklists is tedious.",
    solution: "Voice-to-SOP engine that turns speech into step-by-step checklists.",
    targetAudience: "Agencies and Small Businesses",
    mrrPotential: "$5k - $14k / mo",
    buildComplexity: "Low"
  },
  {
    id: "idea-3",
    name: "ReviewVault",
    niche: "Local Business Reputation",
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
    "name": "Product Name",
    "niche": "Target Niche",
    "problem": "Problem solved",
    "solution": "Key solution",
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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err: any) {
    console.error("[Ideation Agent OpenRouter Log]:", err?.message || err);
  }

  return fallbackIdeas;
}
