import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import { runIdeationAgent } from "./agents/ideation";
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
    const focus = (req.query.focus as string) || "";
    const data = await runIdeationAgent(focus);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      const cleanUi = updated.replace(/```tsx?\s*/gi, "").replace(/```/g, "").trim();
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
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`\n=================================================`);
  console.log(`🚀 FACTORY COCKPIT RUNNING: http://localhost:${PORT}`);
  console.log(`📁 PROJECT VAULT: ~/ai-factory/projects_vault`);
  console.log(`=================================================\n`);
});

// Export app for Vercel serverless function runtime
export default app;
