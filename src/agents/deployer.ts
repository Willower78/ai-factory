import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export async function deployAppToVercel(): Promise<{ url: string; logs: string }> {
  const appDir = path.join(process.cwd(), "output", "app");
  console.log(`[Deployment Specialist - Vercel] Deploying production build from ${appDir}...`);

  try {
    const { stdout, stderr } = await execPromise("npx vercel --prod --yes", {
      cwd: appDir,
      env: { ...process.env },
    });

    const match = stdout.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/);
    const deployUrl = match ? match[0] : stdout.trim().split("\n").pop() || "https://vercel.com";

    return {
      url: deployUrl,
      logs: stdout || stderr,
    };
  } catch (err: any) {
    throw new Error(`Vercel deployment failed: ${err.message}`);
  }
}
