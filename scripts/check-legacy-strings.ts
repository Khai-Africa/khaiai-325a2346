#!/usr/bin/env bun
/**
 * CI guard: fails the build if any legacy "Khai" branding, old domains,
 * emails, or localStorage keys are reintroduced into the codebase.
 *
 * Run locally:  bun run scripts/check-legacy-strings.ts
 * Run in CI:    add `bun run scripts/check-legacy-strings.ts` to the pipeline.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();

// Patterns that should never appear in the repo again.
const FORBIDDEN: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /khai/i, label: "legacy brand 'Khai'" },
  { pattern: /khai\.africa/i, label: "old domain khai.africa" },
  { pattern: /coda\s*house/i, label: "legacy product name 'Coda House'" },
  { pattern: /coda-house/i, label: "legacy slug 'coda-house'" },
  { pattern: /khai_anonymous_(conversations|usage)/, label: "legacy localStorage key" },
  { pattern: /khai-language/, label: "legacy localStorage key 'khai-language'" },
  { pattern: /khai-ai-logo/, label: "legacy asset filename 'khai-ai-logo'" },
  { pattern: /@khai\.africa/i, label: "legacy email address @khai.africa" },
];

// Skip generated/binary/vendored content and this script itself.
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".turbo",
  ".cache", "coverage", ".vite", ".lovable",
]);
const SKIP_FILES = new Set([
  "bun.lockb", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "DEPLOYMENT_CHECKLIST.md",
  "scripts/check-legacy-strings.ts",
  "src/integrations/supabase/types.ts",
  "src/integrations/supabase/client.ts",
]);
const TEXT_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css", ".scss",
  ".md", ".mdx", ".yml", ".yaml", ".toml", ".sh", ".env",
]);

type Hit = { file: string; line: number; text: string; label: string };
const hits: Hit[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (SKIP_DIRS.has(entry)) continue;
    if (SKIP_FILES.has(rel)) continue;
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = extname(entry);
    if (ext && !TEXT_EXTS.has(ext)) continue;
    if (!ext && s.size > 1_000_000) continue;

    let content: string;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, label } of FORBIDDEN) {
        if (pattern.test(lines[i])) {
          hits.push({ file: rel, line: i + 1, text: lines[i].trim(), label });
        }
      }
    }
  }
}

walk(ROOT);

if (hits.length > 0) {
  console.error("\n✗ Legacy string scan failed — forbidden tokens found:\n");
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  [${h.label}]`);
    console.error(`    > ${h.text}`);
  }
  console.error(`\nTotal: ${hits.length} occurrence(s).`);
  console.error("Replace with the new branding (Kmer / kmercoders.com) and re-run.\n");
  process.exit(1);
}

console.log("✓ Legacy string scan passed — no forbidden tokens found.");