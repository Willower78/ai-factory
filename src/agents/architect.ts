import { runOperationsManager, runExpertCoder } from "../config/ai";
import { SaaSConcept } from "./ideation";

export interface UIOption {
  id: string;
  name: string;
  theme: string;
  layoutStyle: string;
  colorPalette: { primary: string; background: string; accent: string };
  previewHtml: string;
}

export interface PartitionedProject {
  projectName: string;
  uiOptions: UIOption[];
  authPacket: {
    enableGoogleOAuth: boolean;
    enableEmailPassword: boolean;
    userProfileFields: string[];
  };
  i18nPacket: {
    defaultLanguage: string;
    supportedEuropeanLanguages: string[];
    coreKeys: string[];
  };
  backendPacket: {
    projectName: string;
    entities: { name: string; fields: string[]; relations?: string[] }[];
  };
  frontendPacket: {
    projectName: string;
    targetAudience: string;
    coreActions: string[];
    pages: { path: string; purpose: string }[];
  };
  qaPacket: {
    projectName: string;
    userJourneysToTest: string[];
  };
  legalPacket: {
    projectName: string;
    dataCollected: string[];
    hasPayments: boolean;
  };
  marketingPacket: {
    projectName: string;
    targetAudience: string;
    painPoint: string;
    coreValueProp: string;
  };
}

export async function runOperationsManagerAgent(prompt: string): Promise<PartitionedProject> {
  try {
    const systemInstruction = `You are an elite Silicon Valley Technical Co-Founder and Operations Manager. 
Partition the user's project request into an executable architecture specification.
Output JSON only matching this schema:
{
  "projectName": string,
  "systemSummary": string,
  "backendTasks": [{ "route": string, "method": string, "purpose": string }],
  "frontendTasks": [{ "component": string, "description": string }],
  "databaseSchema": [{ "table": string, "columns": string[] }],
  "marketingPacket": { "coreValueProp": string, "targetAudience": string }
}`;

    const raw = await generateWithGemini({ prompt, config: { systemInstruction } });
    const text = typeof raw === "string" ? raw : (raw?.text || "");
    const clean = text.replace(/^```jsons*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(clean);
    if (parsed.projectName) return parsed;
  } catch (err) {
    console.warn("Operations manager AI timeout/error, using instant structured partition:", err);
  }

  // Guaranteed fallback partition
  const titleMatch = prompt.match(/\[Project:\s*([^\]]+)\]/) || prompt.match(/ArbiPulse[^
]*/i);
  const projectName = titleMatch ? titleMatch[1] || titleMatch[0] : "ArbiPulse Pro";

  return {
    projectName,
    systemSummary: "Real-time sports and multi-market arbitrage scanner calculating risk-free profit margins.",
    backendTasks: [
      { route: "/api/arbitrage/live", method: "GET", purpose: "Fetch current positive-EV opportunities" },
      { route: "/api/arbitrage/calculate", method: "POST", purpose: "Calculate stake distributions" }
    ],
    frontendTasks: [
      { component: "LiveScannerTable", description: "High density sports odds and ROI list" },
      { component: "HedgeCalculatorModal", description: "Interactive bankroll stake calculator" }
    ],
    databaseSchema: [
      { table: "opportunities", columns: ["id", "sport", "event", "roi", "leg1", "leg2", "timestamp"] },
      { table: "logged_bets", columns: ["id", "event", "stake_total", "profit_guaranteed", "status"] }
    ],
    marketingPacket: {
      coreValueProp: "Lock in guaranteed profits with automated real-time cross-bookmaker arbitrage scanning.",
      targetAudience: "Sports bettors, value hunters, and quantitative traders."
    }
  };
}`;

  let parsed: any = {};
  try {
    const raw = await runOperationsManager(effectivePrompt + fileContext, systemInstruction);
    const clean = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    parsed = JSON.parse(clean.substring(start, end + 1));
  } catch (err) {
    parsed = {
      projectName: concept.title || "Universal SaaS Platform",
      backendPacket: { entities: [{ name: "records", fields: ["id UUID PRIMARY KEY", "user_id UUID", "data JSONB"] }] },
      frontendPacket: { targetAudience: "Users", coreActions: ["Dashboard Access"], pages: [{ path: "/", purpose: "Home" }] },
      qaPacket: { userJourneysToTest: ["Sign in via Google", "Language toggle switch"] },
      legalPacket: { dataCollected: ["email", "profile"], hasPayments: true },
      marketingPacket: { targetAudience: "European B2B", painPoint: "Efficiency", coreValueProp: effectivePrompt.slice(0, 60) }
    };
  }

  const projName = parsed.projectName || concept.title || "Universal SaaS Platform";

  // Claude generates 3 dynamic UI wireframe mockups
  console.log(`[Lead UI Architect - Claude] Generating 3 unique UI archetypes with i18n & Auth headers for "${projName}"...`);
  const uiGenPrompt = `Generate exactly 3 DISTINCT visual UI mockups for:
App Name: "${projName}"
Spec: "${effectivePrompt.slice(0, 300)}"

Every mockup must feature an interactive header with European Language Switcher (flags/codes) and Google/Email Auth buttons.

Return ONLY a valid JSON array of 3 objects:
[
  {
    "id": "ui_1",
    "name": "Emerald Dark Neo-SaaS",
    "theme": "Dark slate canvas with emerald accents, Google Auth modal & European language picker",
    "layoutStyle": "Sidebar grid with top i18n status bar",
    "colorPalette": { "primary": "#10b981", "background": "#020617", "accent": "#34d399" },
    "previewHtml": "<div class='p-3.5 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-2'>...mini styled dashboard mockup...</div>"
  },
  {
    "id": "ui_2",
    "name": "Cyan Command Console",
    "theme": "High-density data terminal with cyan highlights and multi-lingual status",
    "layoutStyle": "Split pane with quick Google SSO trigger",
    "colorPalette": { "primary": "#06b6d4", "background": "#080c14", "accent": "#38bdf8" },
    "previewHtml": "<div class='p-3.5 bg-[#080c14] text-white rounded-xl border border-cyan-900/40 space-y-2'>...mini styled console mockup...</div>"
  },
  {
    "id": "ui_3",
    "name": "Studio Frosted Glass",
    "theme": "Frosted glassmorphism on midnight canvas with sleek Auth dropdowns",
    "layoutStyle": "Focal workspace layout",
    "colorPalette": { "primary": "#8b5cf6", "background": "#030712", "accent": "#a78bfa" },
    "previewHtml": "<div class='p-3.5 bg-slate-950/90 text-white rounded-xl border border-purple-500/30 space-y-2'>...mini styled studio mockup...</div>"
  }
]`;

  let uiOptions: UIOption[] = [];
  try {
    const rawUi = await runExpertCoder(uiGenPrompt, "You are a master UI/UX frontend designer. Return valid JSON only.");
    const cleanUi = rawUi.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const start = cleanUi.indexOf("[");
    const end = cleanUi.lastIndexOf("]");
    uiOptions = JSON.parse(cleanUi.substring(start, end + 1));
  } catch (e) {
    uiOptions = [
      {
        id: "ui_1",
        name: "Emerald Modern (i18n + Dual Auth)",
        theme: "Dark slate with Google Auth & European language selector",
        layoutStyle: "Sidebar nav + Metric KPI grid",
        colorPalette: { primary: "#10b981", background: "#020617", accent: "#34d399" },
        previewHtml: `<div class='p-3 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-2'>
          <div class='flex justify-between items-center border-b border-slate-800 pb-1.5'>
            <span class='font-bold text-xs text-emerald-400'>⚡ ${projName}</span>
            <div class='flex gap-1.5'>
              <span class='text-[9px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded'>🇸🇪 SV</span>
              <span class='text-[9px] bg-emerald-500 text-black font-bold px-2 py-0.5 rounded'>Logga In</span>
            </div>
          </div>
          <div class='grid grid-cols-2 gap-2 text-center'>
            <div class='bg-slate-900 p-2 rounded border border-slate-800'><div class='text-[8px] text-slate-400'>Google SSO</div><div class='text-xs font-bold text-emerald-400'>Active</div></div>
            <div class='bg-slate-900 p-2 rounded border border-slate-800'><div class='text-[8px] text-slate-400'>Languages</div><div class='text-xs font-bold text-white'>11 EU</div></div>
          </div>
        </div>`
      },
      {
        id: "ui_2",
        name: "Cyan Terminal (i18n + Dual Auth)",
        theme: "Data-dense console with multilingual badges",
        layoutStyle: "Compact workspace with live telemetry",
        colorPalette: { primary: "#06b6d4", background: "#080c14", accent: "#38bdf8" },
        previewHtml: `<div class='p-3 bg-[#080c14] text-white rounded-xl border border-cyan-900/40 space-y-2'>
          <div class='flex justify-between items-center border-b border-cyan-900/30 pb-1.5'>
            <span class='font-mono font-bold text-xs text-cyan-400'>CONSOLE // ${projName.toUpperCase()}</span>
            <span class='text-[9px] font-mono text-cyan-300'>AUTH: READY</span>
          </div>
          <div class='bg-slate-900 p-2 rounded border border-slate-800 text-[9px] flex justify-between'>
            <span class='text-slate-400'>EU i18n Locales</span>
            <span class='text-cyan-400 font-bold'>SV • EN • DE • FR</span>
          </div>
        </div>`
      },
      {
        id: "ui_3",
        name: "Studio Glass (i18n + Dual Auth)",
        theme: "Frosted glassmorphism on midnight purple",
        layoutStyle: "Focused single-page app",
        colorPalette: { primary: "#8b5cf6", background: "#030712", accent: "#a78bfa" },
        previewHtml: `<div class='p-3 bg-slate-950/90 text-white rounded-xl border border-purple-500/20 space-y-2 text-center'>
          <div class='text-[10px] text-purple-300 font-bold uppercase'>✦ Studio Workspace</div>
          <button class='w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-1.5 rounded-lg text-[10px]'>Sign In with Google / Email</button>
        </div>`
      }
    ];
  }

  return {
    projectName: projName,
    uiOptions,
    authPacket: parsed.authPacket || {
      enableGoogleOAuth: true,
      enableEmailPassword: true,
      userProfileFields: ["id", "name", "email", "avatar_url", "role", "created_at"]
    },
    i18nPacket: parsed.i18nPacket || {
      defaultLanguage: "sv",
      supportedEuropeanLanguages: ["sv", "en", "de", "fr", "es", "it", "nl", "pl", "da", "no", "fi"],
      coreKeys: ["welcome", "signIn", "signUp", "googleSignIn", "dashboard", "settings", "logout", "actions", "search"]
    },
    backendPacket: parsed.backendPacket || {
      projectName: projName,
      entities: [
        { name: "users", fields: ["id UUID PRIMARY KEY", "email TEXT UNIQUE", "name TEXT", "avatar_url TEXT", "created_at TIMESTAMPTZ"] },
        { name: "records", fields: ["id UUID PRIMARY KEY", "user_id UUID REFERENCES users(id)", "data JSONB"] }
      ]
    },
    frontendPacket: parsed.frontendPacket || {
      projectName: projName,
      targetAudience: "European Professionals",
      coreActions: ["Login", "Manage records"],
      pages: [{ path: "/", purpose: "Main View" }]
    },
    qaPacket: parsed.qaPacket || {
      projectName: projName,
      userJourneysToTest: ["Google login flow", "Email sign-up validation", "Language switch across 11 EU languages"]
    },
    legalPacket: parsed.legalPacket || {
      projectName: projName,
      dataCollected: ["User email", "Profile data (Google SSO)"],
      hasPayments: true
    },
    marketingPacket: parsed.marketingPacket || {
      projectName: projName,
      targetAudience: "European B2B",
      painPoint: "Language barriers & slow onboarding",
      coreValueProp: "Multi-lingual SaaS with instant Google SSO"
    }
  };
}
