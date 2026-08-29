import fs from "fs";
import path from "path";

export function generateDeployScript(projectName: string) {
  const deployScript = `#!/bin/bash
set -e
echo "🚀 DEPLOYING: ${projectName}"
cd output/app
npm install
npm run build
echo "✅ Local build verified! Run: npx vercel --prod"
`;
  const scriptPath = path.join(process.cwd(), "deploy.sh");
  fs.writeFileSync(scriptPath, deployScript);
  fs.chmodSync(scriptPath, "755");
}
