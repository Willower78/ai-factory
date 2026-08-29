import fs from "fs";
import path from "path";
import { runBackendSpecialist, runExpertCoder, runMasterCoderReview } from "../config/ai";
import { PartitionedProject, UIOption } from "./architect";

export async function runIsolatedCoderPipeline(packet: any, chosenUi: any) {
  const targetDir = path.join(process.cwd(), "output", "app");
  fs.mkdirSync(path.join(targetDir, "components"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "app"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "db"), { recursive: true });

  const primaryColor = chosenUi?.colorPalette?.primary || "#10b981";
  const bgColor = chosenUi?.colorPalette?.background || "#020617";
  const accentColor = chosenUi?.colorPalette?.accent || "#34d399";
  const themeName = chosenUi?.name || "Modern Dark SaaS";
  const layoutStyle = chosenUi?.layoutStyle || "Metric dashboard with responsive grid";

  // 1. Backend Expert - PostgreSQL Schema with Supabase Auth & RLS
  console.log("[Backend Architect] Generating PostgreSQL schema with Supabase Auth & RLS...");
  const entities = [
    {
      name: "profiles",
      fields: [
        "id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE",
        "email TEXT UNIQUE",
        "full_name TEXT",
        "avatar_url TEXT",
        "preferred_language TEXT DEFAULT 'en'",
        "created_at TIMESTAMPTZ DEFAULT now()"
      ]
    },
    ...(packet?.backendPacket?.entities || [])
  ];

  const sqlPrompt = `Generate a Supabase PostgreSQL schema with RLS policies and Auth triggers.
Entities:
${JSON.stringify(entities, null, 2)}
Include:
1. Handle new user trigger function from auth.users into public.profiles.
2. Row Level Security (RLS) policies allowing users to read/update only their own rows.
Output valid SQL only inside a markdown code block.`;

  try {
    const rawSql = await runBackendSpecialist(sqlPrompt, "You are a database architect. Output valid SQL only.");
    const textSql = typeof rawSql === "string" ? rawSql : (rawSql?.text || "");
    const cleanSql = textSql.replace(/```sql\s*/gi, "").replace(/```/g, "").trim();
    fs.writeFileSync(path.join(targetDir, "db", "schema.sql"), cleanSql);
  } catch (err) {
    console.warn("Backend schema generation warning:", err);
  }

  // 2. Lead Coder (Claude) - Full Standalone Interactive Beta App
  console.log("[Lead Coder - Claude] Writing standalone interactive prototype...");

  const uiPrompt = `Build a complete, visually stunning, fully interactive single-page web application prototype ready for immediate user testing.
Project: ${packet?.projectName || "SaaS Platform"}
Value Prop: ${packet?.marketingPacket?.coreValueProp || ""}
Design System: ${themeName} - ${chosenUi?.description || ""}
Theme Palette: Primary ${primaryColor}, Accent ${accentColor}, Background ${bgColor}, Layout: ${layoutStyle}

CRITICAL REQUIREMENTS:
- Embedded Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
- FontAwesome 6 CDN: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
- Complete interactive JavaScript state logic (tab navigation, working calculators/inputs, filtering, modal popups, simulated live data updates)
- Complete standalone runnable HTML markup only inside a \`\`\`html code block.`;

  const rawUi = await runExpertCoder(uiPrompt, "You are an elite Lead Frontend & UI Architect. Output HTML code only.");
  const textRawUi = typeof rawUi === "string" ? rawUi : (rawUi?.text || "");

  // 3. Master Code Quality Reviewer
  const reviewPrompt = `Review and polish this application code for high UI/UX fidelity and full responsiveness:
${textRawUi}

Output the finalized, complete HTML document inside a \`\`\`html code block only.`;

  const masterUi = await runMasterCoderReview(reviewPrompt, "You are the Master Code Quality Reviewer. Output HTML code only.");
  const textUi = typeof masterUi === "string" ? masterUi : (masterUi?.text || textRawUi);
  const cleanUi = textUi.replace(/```html\s*/gi, "").replace(/```tsx?\s*/gi, "").replace(/```/g, "").trim();

  fs.writeFileSync(path.join(targetDir, "app", "page.tsx"), cleanUi);
  try {
    fs.writeFileSync(path.join(targetDir, "index.html"), cleanUi);
  } catch (e) {}
  console.log("-> Code generation complete: output/app/index.html & app/page.tsx");
}
