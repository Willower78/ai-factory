import fs from "fs";
import path from "path";

export interface VaultProject {
  id: string;
  name: string;
  slug: string;
  savedAt: string;
  vercelUrl: string | null;
  path: string;
}

const VAULT_DIR = path.join(process.cwd(), "projects_vault");
fs.mkdirSync(VAULT_DIR, { recursive: true });

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function saveCurrentProjectToVault(projectName: string, vercelUrl: string | null): VaultProject {
  const slug = slugify(projectName) || "project";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const projectId = `${slug}_${timestamp}`;
  const targetDir = path.join(VAULT_DIR, projectId);

  const sourceDir = path.join(process.cwd(), "output", "app");
  if (fs.existsSync(sourceDir)) {
    fs.cpSync(sourceDir, targetDir, { recursive: true });
  }

  const meta: VaultProject = {
    id: projectId,
    name: projectName,
    slug,
    savedAt: new Date().toLocaleString("sv-SE"),
    vercelUrl,
    path: targetDir,
  };

  fs.writeFileSync(path.join(targetDir, "vault_meta.json"), JSON.stringify(meta, null, 2));
  return meta;
}

export function listVaultProjects(): VaultProject[] {
  if (!fs.existsSync(VAULT_DIR)) return [];
  const entries = fs.readdirSync(VAULT_DIR);
  const projects: VaultProject[] = [];

  entries.forEach((dir) => {
    const metaPath = path.join(VAULT_DIR, dir, "vault_meta.json");
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        projects.push(meta);
      } catch (e) {
        // Ignore unreadable entries
      }
    }
  });

  return projects.reverse();
}
