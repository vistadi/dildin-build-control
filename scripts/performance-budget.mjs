import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const dist = new URL("../dist/", import.meta.url);
const assets = new URL("assets/", dist);
const assetsPath = fileURLToPath(assets);
if (!existsSync(dist) || !existsSync(assets)) {
  throw new Error("dist/assets is missing. Run the production build before the performance budget.");
}

const budgets = {
  ".js": { raw: 450_000, gzip: 130_000 },
  ".css": { raw: 50_000, gzip: 12_000 },
};
let failed = false;
let measured = 0;

for (const file of readdirSync(assets)) {
  const extension = Object.keys(budgets).find((suffix) => file.endsWith(suffix));
  if (!extension) continue;
  measured += 1;
  const path = join(assetsPath, file);
  const raw = statSync(path).size;
  const gzip = gzipSync(readFileSync(path)).length;
  const budget = budgets[extension];
  const ok = raw <= budget.raw && gzip <= budget.gzip;
  console.log(`${ok ? "PASS" : "FAIL"} ${file}: ${raw} B raw / ${gzip} B gzip (budget ${budget.raw}/${budget.gzip})`);
  failed ||= !ok;
}

if (measured === 0) throw new Error("No JavaScript or CSS production assets were found.");
if (failed) process.exitCode = 1;
else console.log("Performance budget passed.");
