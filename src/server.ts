import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import { runIdeationAgent, scanMarket } from "./agents/ideation";
import { runOperationsManagerAgent, PartitionedProject, UIOption } from "./agents/architect";
import { runIsolatedCoderPipeline } from "./agents/coder";
import { runIsolatedTesterAgent } from "./agents/tester";
import { runIsolatedLegalAgent } from "./agents/legal";
import { runIsolatedMarketingAgent } from "./agents/marketing";
import { runIsolatedSEOAgent } from "./agents/seo";
import { scaffoldNextProject } from "./generators/scaffolder";
import { deployAppToVercel } from "./agents/deployer";
import { saveCurrentProjectToVault, listVaultProjects } from "./utils/vault";
import { runExpertCoder } from "./config/ai";

const upload = multer({ dest: path.join(process.cwd(), "uploads") });
fs.mkdirSync(path.join(process.cwd(), "uploads"), { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());
const publicPath = path.resolve(process.cwd(), "public");
app.use(express.static(publicPath));
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

let activeJob = {
  status: "idle",
  currentStep: "Ready to plan",
  logs: [] as string[],
  partitioned: null as PartitionedProject | null,
  uiOptions: [] as UIOption[],
  chosenUI: null as UIOption | null,
  buildTimestamp: Date.now(),
  deployedUrl: null as string | null,
};

let devServerProcess: any = null;

function ensureDevServer() {
  if (devServerProcess) return;
  const appDir = path.join(process.cwd(), "output", "app");
  
  console.log("[Dev Server] Spawning Next.js dev server on :3000...");
  devServerProcess = spawn("npx", ["next", "dev", "-p", "3000"], {
    cwd: appDir,
    stdio: "inherit",
    shell: true,
  });

  devServerProcess.on("error", (err: any) => {
    console.error("❌ Failed to start dev server:", err);
  });
}

app.post("/api/reset", (req, res) => {
  activeJob = {
    status: "idle",
    currentStep: "Ready to plan",
    logs: [],
    partitioned: null,
    uiOptions: [],
    chosenUI: null,
    buildTimestamp: Date.now(),
    deployedUrl: null,
  };
  res.json({ message: "Reset OK" });
});

app.get("/api/projects", (req, res) => {
  res.json({ projects: listVaultProjects() });
});

app.get("/api/ideas", async (req, res) => {
  try {
    const focus = req.query.focus as string | undefined;
    const ideas = await scanMarket(focus);
    res.json({ ideas, status: "success" });
  } catch (err: any) {
    console.error("API /api/ideas failed:", err);
    res.status(500).json({ ideas: [], error: err.message || "Failed to scan market" });
  }
});

app.post("/api/custom-build", upload.array("attachments"), async (req, res) => {
  const customPrompt = req.body.customPrompt || "";
  const files = (req.files as Express.Multer.File[]) || [];

  const attachedContents: string[] = [];

  for (const f of files) {
    const isZip = f.originalname.toLowerCase().endsWith(".zip") || f.mimetype.includes("zip");

    if (isZip) {
      try {
        console.log(`[ZIP Unpacker] Extracting archive: ${f.originalname}...`);
        const zip = new AdmZip(f.path);
        const zipEntries = zip.getEntries();

        zipEntries.forEach((entry) => {
          if (!entry.isDirectory && !entry.entryName.includes("node_modules") && !entry.entryName.includes(".git")) {
            const ext = path.extname(entry.entryName).toLowerCase();
            if ([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".css", ".html", ".sql"].includes(ext)) {
              const fileData = entry.getData().toString("utf-8");
              attachedContents.push(`ZIP_FILE [${f.originalname} -> ${entry.entryName}]:\n${fileData}`);
            }
          }
        });
        fs.unlinkSync(f.path);
      } catch (zipErr) {
        console.warn(`[ZIP Unpacker] Failed to parse ${f.originalname}:`, zipErr);
      }
    } else {
      try {
        const content = fs.readFileSync(f.path, "utf-8");
        attachedContents.push(`FILE [${f.originalname}]:\n${content}`);
        fs.unlinkSync(f.path);
      } catch {
        attachedContents.push(`FILE [${f.originalname}]: (Binary/Unreadable)`);
      }
    }
  }

  activeJob = {
    status: "planning",
    currentStep: "Operations Manager shredding inputs...",
    logs: [
      `[Operations Manager - ChatGPT] Parsing prompt and ${files.length} uploaded attachment(s)...`,
      `[Air-Gap Protocol] Slicing source files into strictly isolated departmental packets...`
    ],
    partitioned: null,
    uiOptions: [],
    chosenUI: null,
    buildTimestamp: Date.now(),
    deployedUrl: null,
  };
  res.json({ message: "Custom build initiated" });

  try {
    const partitioned = await runOperationsManagerAgent(
      { title: "Universal SaaS Platform", tagline: customPrompt.slice(0, 80) },
      customPrompt,
      attachedContents
    );

    activeJob.partitioned = partitioned;
    activeJob.uiOptions = partitioned.uiOptions;
    activeJob.status = "awaiting_ui_choice";
    activeJob.currentStep = "Select a visual UI wireframe below";
    activeJob.logs.push("✨ 3 tailored UI wireframes ready. Pick a design to build.");
  } catch (err: any) {
    activeJob.status = "error";
    activeJob.logs.push(`❌ Operations error: ${err.message}`);
  }
});

app.post("/api/prepare-ui", async (req, res) => {
  const { concept } = req.body;
  if (!concept) return res.status(400).json({ error: "Missing concept" });

  activeJob = {
    status: "planning",
    currentStep: "Operations Manager generating UI wireframes...",
    logs: [`[Operations Manager] Slicing "${concept.title}" into isolated task packets...`],
    partitioned: null,
    uiOptions: [],
    chosenUI: null,
    buildTimestamp: Date.now(),
    deployedUrl: null,
  };
  res.json({ message: "UI options generating" });

  try {
    const partitioned = await runOperationsManagerAgent(concept);
    activeJob.partitioned = partitioned;
    activeJob.uiOptions = partitioned.uiOptions;
    activeJob.status = "awaiting_ui_choice";
    activeJob.currentStep = "Select a visual UI wireframe below";
    activeJob.logs.push("✨ 3 visual wireframes generated. Select a design to start build.");
  } catch (err: any) {
    activeJob.status = "error";
    activeJob.logs.push(`❌ Planning error: ${err.message}`);
  }
});

app.post("/api/confirm-build", async (req, res) => {
  const { selectedUiId } = req.body;
  if (!activeJob.partitioned) return res.status(400).json({ error: "No active project" });

  const chosenUI = activeJob.uiOptions.find((u) => u.id === selectedUiId) || activeJob.uiOptions[0];
  activeJob.chosenUI = chosenUI;
  activeJob.status = "building";
  activeJob.currentStep = `Building with design: ${chosenUI.name}`;
  activeJob.logs.push(`🎨 Selected: "${chosenUI.name}". Running air-gapped agent assembly line...`);
  res.json({ message: "Build confirmed" });

  (async () => {
    try {
      scaffoldNextProject({
        projectName: activeJob.partitioned!.projectName,
        summary: activeJob.partitioned!.marketingPacket?.coreValueProp || "",
        databaseSchema: [],
        routes: [],
        orderedBuildTasks: [],
      });

      await runIsolatedCoderPipeline(activeJob.partitioned!, chosenUI);
      activeJob.logs.push("[Lead Coder - Claude] Database schema & Next.js UI built.");

      activeJob.currentStep = "Running QA, Legal, SEO & Marketing...";
      await runIsolatedTesterAgent(activeJob.partitioned!);
      await runIsolatedLegalAgent(activeJob.partitioned!);
      await runIsolatedSEOAgent(activeJob.partitioned!);
      await runIsolatedMarketingAgent(activeJob.partitioned!);
      activeJob.logs.push("[SEO Specialist - Gemini] Robots.txt, sitemap.ts & Schema.org JSON-LD deployed.");

      saveCurrentProjectToVault(activeJob.partitioned!.projectName, null);
      activeJob.logs.push(`💾 Saved snapshot to ~/ai-factory/projects_vault/`);

      ensureDevServer();
      activeJob.buildTimestamp = Date.now();
      activeJob.status = "completed";
      activeJob.currentStep = "Live Sandbox Ready";
      activeJob.logs.push("🎉 Application built! Sandbox live at localhost:3000.");
    } catch (err: any) {
      activeJob.status = "error";
      activeJob.logs.push(`❌ Build error: ${err.message}`);
    }
  })();
});

app.post("/api/tweak", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing tweak instructions" });

  activeJob.status = "tweaking";
  activeJob.currentStep = "Applying AI modifications...";
  activeJob.logs.push(`🔧 Prompting tweak: "${prompt}"`);
  res.json({ message: "Tweak in progress" });

  (async () => {
    try {
      const pagePath = path.join(process.cwd(), "output", "app", "app", "page.tsx");
      const currentCode = fs.readFileSync(pagePath, "utf-8");

      const tweakPrompt = `Modify this React page.tsx according to user instructions:
USER INSTRUCTION: "${prompt}"
CURRENT CODE:
\`\`\`tsx
${currentCode}
\`\`\`
Return ONLY updated TSX code inside a standard markdown code block.`;

      const updated = await runExpertCoder(tweakPrompt, "You are a Next.js specialist. Output valid TSX only.");
      const textUp = typeof updated === "string" ? updated : (updated?.text || "");
      const cleanUi = textUp.replace(/```tsx?\s*/gi, "").replace(/```/g, "").trim();
      fs.writeFileSync(pagePath, cleanUi);

      activeJob.buildTimestamp = Date.now();
      activeJob.status = "completed";
      activeJob.currentStep = "Tweak applied!";
      activeJob.logs.push("✅ Code updated! Live preview refreshed.");
    } catch (err: any) {
      activeJob.status = "completed";
      activeJob.logs.push(`❌ Tweak error: ${err.message}`);
    }
  })();
});

app.post("/api/deploy", async (req, res) => {
  activeJob.status = "deploying";
  activeJob.currentStep = "Deploying to Vercel...";
  activeJob.logs.push("🚀 [Vercel Specialist] Building production bundle and shipping to edge...");
  res.json({ message: "Deployment initiated" });

  (async () => {
    try {
      const result = await deployAppToVercel();
      activeJob.deployedUrl = result.url;
      activeJob.status = "completed";
      activeJob.currentStep = `Live on Vercel: ${result.url}`;
      activeJob.logs.push(`🎉 DEPLOYED LIVE: ${result.url}`);

      const projName = activeJob.partitioned?.projectName || "Custom SaaS";
      saveCurrentProjectToVault(projName, result.url);
    } catch (err: any) {
      activeJob.status = "completed";
      activeJob.logs.push(`❌ Deployment error: ${err.message}`);
    }
  })();
});

app.get("/api/status", (req, res) => {
  res.json(activeJob);
});

const PORT = process.env.PORT || 10000;

app.get("/api/preview", (req, res) => {
  try {
    const targetDir = path.resolve(process.cwd(), "output/app");
    const pageTsxPath = path.join(targetDir, "app", "page.tsx");

    if (!fs.existsSync(pageTsxPath)) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><script src="https://cdn.tailwindcss.com"></script></head>
          <body class="bg-slate-950 text-slate-400 flex items-center justify-center h-screen font-sans">
            <div class="text-center p-8 border border-slate-800 rounded-xl bg-slate-900/60 shadow-xl">
              <p class="text-emerald-400 font-semibold mb-2">Build In Progress or Not Started</p>
              <p class="text-xs text-slate-500">Trigger a build from the AI Factory to generate the preview.</p>
            </div>
          </body>
        </html>
      `);
    }

    let pageCode = fs.readFileSync(pageTsxPath, "utf8");

    // Clean imports, directives and "export default" to run standalone in browser React
    pageCode = pageCode
      .replace(/^[s]*["']use client["'];?/gm, "")
      .replace(/^[s]*imports+.*?froms+['"].*?['"];?/gm, "")
      .replace(/^[s]*exports+defaults+functions+/gm, "function AppMain()")
      .replace(/^[s]*exports+functions+/gm, "function ")
      .replace(/^[s]*exports+defaults+/gm, "const AppMain = ");

    const htmlDoc = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#10b981', 600: '#059669' }
          }
        }
      }
    }
  </script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background-color: #020617; color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useMemo, useRef } = React;

    // Fallback Lucide Icon component proxy
    const LucideIcon = ({ name, size = 18, className = "" }) => {
      useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
      }, [name]);
      return <i data-lucide={name ? name.toLowerCase().replace(/([a-z])([A-Z])/g, '$1-$2') : "activity"} className={className} style={{ width: size, height: size }}></i>;
    };

    // Proxy common icons dynamically into global React scope
    const iconNames = ["Sparkles","Check","X","Activity","BarChart","Calendar","DollarSign","Globe","Layers","Lock","Mail","Play","Plus","Search","Settings","Shield","Trash","User","Users","Zap","Menu","TrendingUp","ArrowRight","Download","Share2"];
    iconNames.forEach(icon => {
      window[icon] = (props) => <LucideIcon name={icon} {...props} />;
    });

    ${pageCode}

    const AppContainer = typeof AppMain !== 'undefined' ? AppMain : (typeof App !== 'undefined' ? App : () => <div className="p-8 text-center text-red-400">Component root not found</div>);

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<AppContainer />);

    setTimeout(() => {
      if (window.lucide) window.lucide.createIcons();
    }, 100);
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(htmlDoc);
  } catch (err) {
    res.status(500).send(`<div style="color:red;padding:20px;font-family:monospace;">Preview compilation failed: ${err.message}</div>`);
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`\n=================================================`);
  console.log(`🚀 FACTORY COCKPIT RUNNING: http://localhost:${PORT}`);
  console.log(`📁 PROJECT VAULT: ~/ai-factory/projects_vault`);
  console.log(`=================================================\n`);
});

// Export app for Vercel serverless function runtime
export default app;
