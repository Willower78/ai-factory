import fs from "fs";
import path from "path";
import { runGeneralAssistant } from "../config/ai";
import { PartitionedProject } from "./architect";

export async function runIsolatedSEOAgent(project: PartitionedProject): Promise<void> {
  const targetDir = path.join(process.cwd(), "output", "app");
  const seoDir = path.join(targetDir, "app");
  fs.mkdirSync(seoDir, { recursive: true });

  console.log(`[SEO & Visibility Specialist - Gemini] Optimizing indexability and metadata for "${project.projectName}"...`);

  const prompt = `You are a Technical SEO & Growth Engineering Specialist.
Generate full production-ready SEO scaffolding for this Next.js App Router project:
Project Name: "${project.projectName}"
Value Prop: "${project.marketingPacket?.coreValueProp || ''}"
Target Audience: "${project.marketingPacket?.targetAudience || 'European Businesses'}"
Languages: ${project.i18nPacket?.supportedEuropeanLanguages.join(", ") || 'sv, en, de, fr, es, it'}

Return ONLY a JSON object matching this schema:
{
  "robotsTxt": "User-agent: *\\nAllow: /\\nSitemap: https://app-url.vercel.app/sitemap.xml",
  "sitemapTs": "export default function sitemap() { return [...] }",
  "structuredDataJsonLd": { "@context": "https://schema.org", "@type": "SoftwareApplication" },
  "seoStrategyMarkdown": "# Comprehensive SEO & Keyword Strategy..."
}`;

  try {
    const raw = await runGeneralAssistant(prompt, "You are a Technical SEO expert. Return valid JSON only.");
    const clean = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const parsed = JSON.parse(clean.substring(start, end + 1));

    const robotsCode = `export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://localhost:3000/sitemap.xml',
  };
}`;
    fs.writeFileSync(path.join(seoDir, "robots.ts"), robotsCode);

    const sitemapCode = parsed.sitemapTs || `export default function sitemap() {
  return [
    { url: 'https://localhost:3000', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];
}`;
    fs.writeFileSync(path.join(seoDir, "sitemap.ts"), sitemapCode);
    fs.writeFileSync(path.join(targetDir, "SEO_STRATEGY.md"), parsed.seoStrategyMarkdown || "# SEO Strategy");
    console.log("-> SEO scaffolding & JSON-LD injected: app/robots.ts, app/sitemap.ts, SEO_STRATEGY.md");
  } catch (err: any) {
    console.warn("[SEO Agent] Fallback scaffolding applied:", err.message);
    const fallbackRobots = `export default function robots() { return { rules: { userAgent: '*', allow: '/' } }; }`;
    fs.writeFileSync(path.join(seoDir, "robots.ts"), fallbackRobots);
  }
}
