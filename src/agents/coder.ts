import fs from "fs";
import path from "path";
import { runBackendSpecialist, runExpertCoder, runMasterCoderReview } from "../config/ai";
import { PartitionedProject, UIOption } from "./architect";

export async function runIsolatedCoderPipeline(project: PartitionedProject, chosenUI?: UIOption) {
  const targetDir = path.join(process.cwd(), "output", "app");
  fs.mkdirSync(path.join(targetDir, "components"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "app"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "db"), { recursive: true });

  const primaryColor = chosenUI?.colorPalette?.primary || "#10b981";
  const bgColor = chosenUI?.colorPalette?.background || "#020617";
  const accentColor = chosenUI?.colorPalette?.accent || "#34d399";
  const themeName = chosenUI?.name || "Modern Dark SaaS";
  const layoutStyle = chosenUI?.layoutStyle || "Metric dashboard with responsive grid";

  // 1. Backend Expert (Kimi K3) - Schema with Supabase Auth integration
  console.log("[Backend Architect - Kimi K3] Generating PostgreSQL schema with Supabase Auth & RLS...");
  const entities = [
    {
      name: "profiles",
      fields: [
        "id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE",
        "email TEXT UNIQUE",
        "full_name TEXT",
        "avatar_url TEXT",
        "preferred_language TEXT DEFAULT 'sv'",
        "created_at TIMESTAMPTZ DEFAULT now()"
      ]
    },
    ...(project.backendPacket?.entities || [])
  ];

  const sqlPrompt = `Generate a Supabase PostgreSQL schema with RLS policies and Auth triggers.
Entities:
${JSON.stringify(entities, null, 2)}
Include:
1. Handle new user trigger function from auth.users into public.profiles (supporting Google OAuth & email signups).
2. Row Level Security (RLS) policies allowing users to read/update only their own rows.
Output valid SQL only inside a markdown code block.`;

  const rawSql = await runBackendSpecialist(sqlPrompt, "You are a database architect. Output valid SQL only.");
  const cleanSql = rawSql.replace(/```sql\s*/gi, "").replace(/```/g, "").trim();
  fs.writeFileSync(path.join(targetDir, "db", "schema.sql"), cleanSql);

  // 2. Lead Coder (Claude) - Full Next.js 15 UI with European i18n & Dual Auth
  console.log(`[Lead Coder - Claude] Writing Next.js 15 app with ALL European languages and Google + Email Auth...`);
  
  const uiPrompt = `Build page.tsx for Next.js 15 App Router using TypeScript and Tailwind CSS.
App Name: "${project.projectName || 'Enterprise SaaS'}"
Audience: "${project.frontendPacket?.targetAudience || 'European Users'}"

MANDATORY FEATURES TO IMPLEMENT:
1. ALL EUROPEAN LANGUAGES (i18n):
   - Provide a language switcher dropdown in the header supporting:
     🇸🇪 Svenska (sv), 🇬🇧 English (en), 🇩🇪 Deutsch (de), 🇫🇷 Français (fr), 🇪🇸 Español (es), 🇮🇹 Italiano (it), 🇳🇱 Nederlands (nl), 🇵🇱 Polski (pl), 🇩🇰 Dansk (da), 🇳🇴 Norsk (no), 🇫🇮 Suomi (fi).
   - Implement an in-memory dictionary / translation hook (useLanguage / t('key')) that translates headers, buttons, cards, table columns, and auth prompts dynamically.

2. DUAL AUTHENTICATION SYSTEM (Google SSO + Email/Password):
   - Header shows "Sign In / Register" button when unauthenticated, or User Avatar with dropdown when logged in.
   - Beautiful Auth Modal containing:
     * "Continue with Google" (with official Google 'G' icon & 1-click SSO simulation).
     * Divider ("or with email").
     * Email & Password input fields with validation and "Sign In / Create Account" tab toggle.
     * Switch between simulated test users (e.g. Admin, Player/User, Guest).

3. DESIGN SYSTEM & POLISH:
   - Theme: ${themeName}
   - Primary Accent: ${primaryColor}
   - Canvas Background: ${bgColor}
   - Layout: ${layoutStyle}
   - Interactive widgets, stat KPI cards with percentage trends, interactive data tables with search/filter, and action modals.

Output ONLY valid TSX code inside a standard markdown code block.`;

  const draftUi = await runExpertCoder(uiPrompt, "You are an elite Next.js full-stack engineer. Output TSX only.");

  // 3. Master Coder (Claude 3.7) Review
  console.log("[Master Coder - Claude 3.7] Reviewing code quality, i18n stability & Auth modal...");
  const reviewPrompt = `Audit and finalize this Next.js TSX component:
\`\`\`tsx
${draftUi}
\`\`\`
Ensure all Lucide icons, language switcher hooks, and Auth modal state transitions work seamlessly. Output TSX only.`;

  const masterUi = await runMasterCoderReview(reviewPrompt, "You are the Master Code Quality Reviewer. Output TSX only.");
  const cleanUi = masterUi.replace(/```tsx?\s*/gi, "").replace(/```/g, "").trim();
  fs.writeFileSync(path.join(targetDir, "app", "page.tsx"), cleanUi);
  console.log("-> Code generation complete: output/app/app/page.tsx");
}
