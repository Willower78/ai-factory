import { exec, spawn } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export async function startLivePreview() {
  const appDir = path.join(process.cwd(), "output", "app");
  console.log("\n=================================================");
  console.log("🌐 STARTING AUTOMATED LIVE PREVIEW ENVIRONMENT");
  console.log("=================================================");

  console.log("[Preview] Installing dependencies in output/app...");
  try {
    await execPromise("npm install", { cwd: appDir });
  } catch (err) {
    console.warn("⚠️ npm install warning:", err);
  }

  console.log("\n🚀 Launching Next.js dev server on http://localhost:3000...");
  
  spawn("npm", ["run", "dev"], {
    cwd: appDir,
    stdio: "inherit",
    shell: true,
  });
}
