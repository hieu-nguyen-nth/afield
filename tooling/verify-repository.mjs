import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const bad = [];
const excluded =
  /(^|\/)(node_modules|\.next|\.vercel|\.trigger|test-results|playwright-report|exports|backups|test-evidence)(\/|$)|(^|\/)\.env(?!\.example$)|\.DS_Store$|\.tsbuildinfo$|\.(pem|key|p12|pfx|sqlite|db)$/;
const secrets = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAIza[0-9A-Za-z_-]{25,}\b/,
  /\b(?:ghp_|github_pat_|sb_secret_|tvly-)[A-Za-z0-9_-]{15,}\b/,
];
let links = 0;
for (const file of files) {
  if (excluded.test(file)) bad.push(`${file}: excluded local/private artifact`);
  const buf = readFileSync(file);
  if (buf.includes(0)) continue;
  const text = buf.toString("utf8");
  if (secrets.some((re) => re.test(text)))
    bad.push(`${file}: possible credential`);
  if (file.endsWith(".md"))
    for (const match of text.matchAll(
      /!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
    )) {
      let target = match[1].replace(/^<|>$/g, "").split("#")[0];
      if (!target || /^[a-z][\w+.-]*:/i.test(target)) continue;
      try {
        target = decodeURIComponent(target);
      } catch {
        bad.push(`${file}: malformed link`);
        continue;
      }
      const dest = path.resolve(path.dirname(file), target);
      if (!existsSync(dest)) bad.push(`${file}: missing link ${target}`);
      links++;
    }
  if (
    file.endsWith(".md") &&
    /\/Users\/|tusojzkiwfhlvjfkkiui|thread:\/\//.test(text)
  )
    bad.push(`${file}: local or private-only reference`);
}
for (const ignored of [
  "apps/web/.env.local",
  "apps/web/.vercel/project.json",
  "node_modules/",
  "apps/web/.next/",
  "apps/web/test-results/",
  "apps/web/tsconfig.tsbuildinfo",
]) {
  try {
    execFileSync("git", ["check-ignore", "--quiet", ignored]);
  } catch {
    bad.push(`ignore rule missing: ${ignored}`);
  }
}
if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: ${files.length} publication files checked; ${links} local documentation links resolve; excluded paths ignored; no supported credential patterns found. Manual review remains required.`,
);
