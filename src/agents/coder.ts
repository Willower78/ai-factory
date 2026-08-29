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
  const textSql = typeof rawSql === "string" ? rawSql : (rawSql?.text || "");
  const cleanSql = textSql.replace(/```sql\s*/gi, "").replace(/```/g, "").trim();
  fs.writeFileSync(path.join(targetDir, "db", "schema.sql"), cleanSql);

  // 2. Lead Coder (Claude) - Full Next.js 15 UI with European i18n & Dual Auth
  console.log(`[Lead Coder - Claude] Writing Next.js 15 app with ALL European languages and Google + Email Auth...`);
  
  const uiPrompt = `Build a complete, visually stunning, fully interactive single-page application prototype based on this blueprint.
Include:
- Complete HTML document structure with Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
- FontAwesome 6 / SVG icons
- Fully interactive JavaScript state logic (tab switches, modals, dummy data actions, filterable tables, responsive drawer menus)
- Ultra high-fidelity styling matching the selected visual theme.

Output the complete, runnable HTML markup inside a \`\`\`html code block.`;

  // Ensure all Lucide icons, language switcher hooks, and Auth modal state transitions work seamlessly. Output TSX only.`;

  const masterUi = await runMasterCoderReview(reviewPrompt, "You are the Master Code Quality Reviewer. Output TSX only.");
  const textUi = typeof masterUi === "string" ? masterUi : (masterUi?.text || "");
  const cleanUi = textUi.replace(/```tsx?\s*/gi, "").replace(/```/g, "").trim();
  fs.writeFileSync(path.join(targetDir, "app", "page.tsx"), cleanUi);
  try {
    fs.writeFileSync(path.join(targetDir, "index.html"), cleanUi);
  } catch (e) {}
  console.log("-> Code generation complete: output/app/app/page.tsx");
}
