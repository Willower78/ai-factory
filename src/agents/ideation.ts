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

export async function scanMarket(focus?: string) {
  try {
    const prompt = `Identify 3 high-demand, underserved B2B/B2C SaaS market opportunities${focus ? ` focused on ${focus}` : ""}.
For each opportunity provide:
- name: string (Catchy SaaS product name)
- problem: string (1 concise sentence describing the user pain point)
- solution: string (1 concise sentence describing the core automated tool)
- potentialRevenue: string (e.g. "$15k - $45k MRR")
- difficulty: "Low" | "Medium" | "High"

Return valid JSON array only inside a \`\`\`json code block.`;

    const raw = await runIdeationAgent(prompt, "You are a Silicon Valley SaaS market analyst. Output valid JSON array only.");
    const text = typeof raw === "string" ? raw : (raw?.text || "");
    const clean = text.replace(/^```jsons*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (parsed.ideas && Array.isArray(parsed.ideas)) return parsed.ideas;
  } catch (err) {
    console.warn("Market scan AI timeout/error, using instant fallback ideas:", err);
  }

  // Guaranteed fallback opportunities
  return [
    {
      name: "ArbiPulse Pro",
      problem: "Sports bettors and crypto traders miss cross-market mispricings due to manual odds calculations.",
      solution: "Real-time arbitrage terminal calculating hedge stakes and locked-in profit margins across bookmakers.",
      potentialRevenue: "$25k - $60k MRR",
      difficulty: "Medium"
    },
    {
      name: "ContentAudit AI",
      problem: "SEO agencies waste 15+ hours weekly manually cataloging competitor content gaps and keyword decay.",
      solution: "One-click SERP crawler that generates downloadable content refresh briefs and Schema markup.",
      potentialRevenue: "$18k - $40k MRR",
      difficulty: "Low"
    },
    {
      name: "VenueFlow",
      problem: "Independent sports clubs and venues struggle with fragmented ticket sales and manual booking spreadsheets.",
      solution: "White-label embeddable booking calendar widget with automated Stripe payouts and QR check-ins.",
      potentialRevenue: "$12k - $30k MRR",
      difficulty: "Low"
    }
  ];
}
