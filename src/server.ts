import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import AdmZip from "adm-zip";
import { runIdeationAgent, scanMarket } from "./agents/ideation";
import { runOperationsManagerAgent, runWireframeArchitect, PartitionedProject, UIOption } from "./agents/architect";
import { runIsolatedCoderPipeline } from "./agents/coder";
import { runIsolatedTesterAgent } from "./agents/tester";
import { runIsolatedLegalAgent } from "./agents/legal";
import { runIsolatedMarketingAgent } from "./agents/marketing";
import { runIsolatedSEOAgent } from "./agents/seo";
import { scaffoldNextProject } from "./generators/scaffolder";
import { deployAppToVercel } from "./agents/deployer";
import { saveCurrentProjectToVault, listVaultProjects } from "./utils/vault";
import { runExpertCoder, runMasterCoderReview } from "./config/ai";

const upload = multer({ dest: path.join(process.cwd(), "uploads") });
fs.mkdirSync(path.join(process.cwd(), "uploads"), { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const publicPath = path.resolve(process.cwd(), "public");
app.use(express.static(publicPath));
app.use("/output", express.static(path.resolve(process.cwd(), "output")));

app.get("/favicon.ico", (req, res) => res.status(204).end());

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

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.post("/api/reset", (req, res) => {
  activeJob = {
    status: "idle",
    currentStep: "Ready to plan",
    logs: ["[System] Factory pipeline reset."],
    partitioned: null,
    uiOptions: [],
    chosenUI: null,
    buildTimestamp: Date.now(),
    deployedUrl: null,
  };
  res.json({ status: "reset_successful" });
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
      } catch (err) {
        console.error("Failed to unpack zip file:", err);
      }
    } else {
      try {
        const content = fs.readFileSync(f.path, "utf-8");
        attachedContents.push(`ATTACHMENT [${f.originalname}]:\n${content}`);
      } catch (err) {
        console.error("Failed to read attachment:", err);
      }
    }
  }

  const combinedPrompt = `${customPrompt}\n\n${attachedContents.join("\n\n---\n\n")}`.trim();

  activeJob.status = "planning";
  activeJob.currentStep = "Operations Manager Slicing Architecture...";
  activeJob.logs = [
    `[Operations Manager] Initializing custom build with ${files.length} attached spec/code files.`,
    `[Operations Manager] Slicing functional requirements & API contracts...`
  ];
  activeJob.partitioned = null;
  activeJob.uiOptions = [];
  activeJob.chosenUI = null;

  res.json({ status: "processing" });

  (async () => {
    try {
      const partitioned = await runOperationsManagerAgent(combinedPrompt);
      activeJob.partitioned = partitioned;
      activeJob.logs.push(`[Operations Manager] Project "${partitioned.projectName}" partitioned successfully.`);

      activeJob.currentStep = "Architect designing 3 wireframe variations...";
      activeJob.logs.push("[Architect] Drafting 3 distinct UI blueprints...");

      const rawUi = await runWireframeArchitect(partitioned);
      const textUi = typeof rawUi === "string" ? rawUi : (rawUi?.text || "");
      const cleanUi = textUi.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

      let parsed: any = [];
      try {
        parsed = JSON.parse(cleanUi);
      } catch {
        parsed = [];
      }

      activeJob.uiOptions = Array.isArray(parsed) ? parsed : (parsed.options || []);
      if (activeJob.uiOptions.length === 0) {
        activeJob.uiOptions = [
          {
            name: "Emerald Dark Neo-SaaS",
            description: "High-contrast dark terminal with emerald metrics, glassmorphic cards, and quick-action toolbars.",
            layoutStyle: "Metric dashboard with responsive grid",
            colorPalette: { primary: "#10b981", accent: "#34d399", background: "#020617" }
          },
          {
            name: "Cyan Command Console",
            description: "Bloomberg-style trading console with high-density odds tables, live ticker, and hedge modals.",
            layoutStyle: "Dense real-time data table with side drawer",
            colorPalette: { primary: "#06b6d4", accent: "#22d3ee", background: "#090d16" }
          },
          {
            name: "Studio Frosted Glass",
            description: "Modern clean interface with frosted panels, slate accents, and interactive tabs.",
            layoutStyle: "Fluid tabbed workspace layout",
            colorPalette: { primary: "#818cf8", accent: "#a5b4fc", background: "#0f172a" }
          }
        ];
      }

      activeJob.logs.push("✨ 3 wireframe blueprints ready. Choose a design to build.");
      activeJob.status = "awaiting_ui_choice";
      activeJob.currentStep = "Awaiting UI Blueprint Selection";
    } catch (err: any) {
      console.error("Operations Manager / Wireframe error:", err);
      activeJob.status = "error";
      activeJob.logs.push(`❌ Planning error: ${err.message || String(err)}`);
    }
  })();
});

app.post("/api/regenerate-ui", async (req, res) => {
  if (!activeJob.partitioned) {
    return res.status(400).json({ error: "No active project partitioned yet." });
  }

  try {
    const rawUi = await runWireframeArchitect(activeJob.partitioned);
    const textUi = typeof rawUi === "string" ? rawUi : (rawUi?.text || "");
    const cleanUi = textUi.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsed: any = [];
    try {
      parsed = JSON.parse(cleanUi);
    } catch {
      parsed = [];
    }

    activeJob.uiOptions = Array.isArray(parsed) ? parsed : (parsed.options || []);
    activeJob.logs.push("✨ 3 fresh wireframe blueprints ready for selection.");
    res.json({ uiOptions: activeJob.uiOptions });
  } catch (err: any) {
    console.error("Regeneration error:", err);
    res.status(500).json({ error: "Failed to regenerate wireframes" });
  }
});

app.post("/api/confirm-build", async (req, res) => {
  const { chosenUI } = req.body;
  activeJob.chosenUI = chosenUI;
  activeJob.status = "building";
  activeJob.currentStep = "Stage 1/4: Domain Math & Data Seeder...";
  activeJob.logs.push(`🎨 Selected: "${chosenUI?.name || "Custom"}" - Launching 4-Stage Deep Assembly Line...`);

  res.json({ status: "started" });

  (async () => {
    try {
      scaffoldNextProject({
        projectName: activeJob.partitioned?.projectName || "SaaS App",
        summary: activeJob.partitioned?.marketingPacket?.coreValueProp || "",
        databaseSchema: [],
        routes: [],
        orderedBuildTasks: [],
      });

      await runIsolatedCoderPipeline(activeJob.partitioned, chosenUI, (msg) => {
        activeJob.logs.push(msg);
        if (msg.includes("Stage 1/4")) activeJob.currentStep = "Stage 1/4: Math & Data Engine";
        if (msg.includes("Stage 2/4")) activeJob.currentStep = "Stage 2/4: Reactive State Store";
        if (msg.includes("Stage 3/4")) activeJob.currentStep = "Stage 3/4: Tailwind UI Assembly";
        if (msg.includes("Stage 4/4")) activeJob.currentStep = "Stage 4/4: Quality & Syntax Audit";
      });

      activeJob.currentStep = "Running SEO, Legal & Marketing...";
      if (typeof runIsolatedTesterAgent === "function") await runIsolatedTesterAgent(activeJob.partitioned).catch(e => console.warn(e));
      if (typeof runIsolatedLegalAgent === "function") await runIsolatedLegalAgent(activeJob.partitioned).catch(e => console.warn(e));
      if (typeof runIsolatedSEOAgent === "function") await runIsolatedSEOAgent(activeJob.partitioned).catch(e => console.warn(e));
      if (typeof runIsolatedMarketingAgent === "function") await runIsolatedMarketingAgent(activeJob.partitioned).catch(e => console.warn(e));

      saveCurrentProjectToVault(activeJob.partitioned?.projectName || "SaaS App", null);
      activeJob.logs.push("🚀 Deep Assembly Complete! Production-grade app ready in sandbox.");
      activeJob.status = "done";
      activeJob.currentStep = "Ready";
    } catch (err) {
      console.error("Critical build error:", err);
      activeJob.logs.push(`❌ Build error: ${err.message || String(err)}`);
      activeJob.status = "error";
      activeJob.currentStep = "Build failed";
    }
  })();
});

app.post("/api/tweak", async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) {
    return res.status(400).json({ error: "Instruction prompt is required" });
  }

  const targetDir = path.resolve(process.cwd(), "output", "app");
  const indexPath = path.join(targetDir, "index.html");
  const pagePath = path.join(targetDir, "app", "page.tsx");

  let currentCode = "";
  if (fs.existsSync(indexPath)) {
    currentCode = fs.readFileSync(indexPath, "utf8");
  } else if (fs.existsSync(pagePath)) {
    currentCode = fs.readFileSync(pagePath, "utf8");
  }

  if (!currentCode) {
    return res.status(400).json({ error: "No active application found to iterate upon." });
  }

  activeJob.status = "iterating";
  activeJob.currentStep = "Iterating feature additions...";
  activeJob.logs.push(`🔨 [Iterative Builder] Instruction: "${instruction.slice(0, 80)}..."`);

  try {
    const iteratePrompt = `You are the Lead Full-Stack Architect continuing work on an existing single-page web application.

EXISTING APPLICATION SOURCE CODE:
${currentCode}

USER INSTRUCTION FOR NEXT ITERATION / EXPANSION:
${instruction}

INSTRUCTIONS:
1. Preserve all existing working features, calculations, and UI styling.
2. Fully integrate the new feature request directly into the code.
3. Ensure all JS handlers, event listeners, Tailwind styling, and buttons work with zero syntax errors.
4. Output the complete, updated standalone HTML document inside a \`\`\`html code block only.`;

    const rawResponse = await runExpertCoder(iteratePrompt, "You are a master software engineer. Output updated HTML code only.");
    const textRaw = typeof rawResponse === "string" ? rawResponse : (rawResponse?.text || "");

    const reviewPrompt = `Review and polish this updated application code to ensure all new and existing features function seamlessly:
${textRaw}

Output the finalized complete HTML document inside a \`\`\`html code block only.`;

    const reviewed = await runMasterCoderReview(reviewPrompt, "You are the Master Code Quality Reviewer. Output finalized HTML code only.");
    const textFinal = typeof reviewed === "string" ? reviewed : (reviewed?.text || textRaw);
    const cleanCode = textFinal.replace(/```html\s*/gi, "").replace(/```tsx?\s*/gi, "").replace(/```/g, "").trim();

    fs.writeFileSync(indexPath, cleanCode, "utf8");
    fs.writeFileSync(pagePath, cleanCode, "utf8");

    activeJob.logs.push("✨ Iteration complete. Live preview updated.");
    activeJob.status = "done";

    res.json({ status: "success" });
  } catch (err: any) {
    console.error("Iteration error:", err);
    activeJob.logs.push(`❌ Iteration failed: ${err.message || String(err)}`);
    res.status(500).json({ error: err.message || "Failed to update project" });
  }
});

app.post("/api/deploy", async (req, res) => {
  try {
    activeJob.status = "deploying";
    activeJob.currentStep = "Deploying to Vercel production...";
    const targetDir = path.resolve(process.cwd(), "output", "app");
    const deployRes = await deployAppToVercel(targetDir, activeJob.partitioned?.projectName || "saas-app");

    if (deployRes && deployRes.url) {
      activeJob.deployedUrl = deployRes.url;
      activeJob.logs.push(`🌍 Deployed live to Vercel: ${deployRes.url}`);
      activeJob.status = "done";
      res.json({ success: true, url: deployRes.url });
    } else {
      throw new Error("Vercel deployment did not return a valid URL");
    }
  } catch (err: any) {
    console.error("Deploy error:", err);
    activeJob.logs.push(`❌ Deploy failed: ${err.message || String(err)}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/status", (req, res) => {
  res.json(activeJob);
});

app.get("/api/preview", (req, res) => {
  try {
    const targetDir = path.resolve(process.cwd(), "output", "app");
    const indexHtml = path.join(targetDir, "index.html");
    const pageTsx = path.join(targetDir, "app", "page.tsx");

    if (fs.existsSync(indexHtml)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(fs.readFileSync(indexHtml, "utf8"));
    }

    if (fs.existsSync(pageTsx)) {
      const content = fs.readFileSync(pageTsx, "utf8");
      if (content.includes("<html") || content.includes("<!DOCTYPE html>")) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(content);
      }
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-200 flex items-center justify-center h-screen font-sans">
          <div class="text-center p-8 border border-slate-800 rounded-2xl bg-slate-900/80 shadow-2xl max-w-md">
            <div class="w-3 h-3 bg-emerald-500 rounded-full animate-ping mx-auto mb-4"></div>
            <h2 class="text-lg font-bold text-white mb-2">Build In Progress or Not Started</h2>
            <p class="text-sm text-slate-400 mb-4">Submit your project in AI Factory and click "Build with this UI" to generate the web app.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`<div style="color:red;padding:20px;font-family:sans-serif;">Preview Error: ${err.message}</div>`);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🚀 FACTORY COCKPIT RUNNING: http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});
