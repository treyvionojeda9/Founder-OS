/**
 * Fails when the main entry chunk gzip exceeds the budget.
 * The budget is the measured production entry (109,392 bytes gzip) plus about 20%.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dist = new URL("../dist/", import.meta.url).pathname;
const html = readFileSync(join(dist, "index.html"), "utf8");
const match = html.match(/src="(\/assets\/[^"]+\.js)"/);
if (!match) {
  console.error("bundle budget: index.html has no entry script");
  process.exit(1);
}
const file = join(dist, match[1].slice(1));
const gzip = gzipSync(readFileSync(file), { level: 6 }).length;
const budget = 131_270;
const assets = readdirSync(join(dist, "assets"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => {
    const body = readFileSync(join(dist, "assets", name));
    return { name, gzip: gzipSync(body, { level: 6 }).length };
  })
  .sort((a, b) => b.gzip - a.gzip);

console.log("entry", match[1], `${gzip} gzip bytes`, `budget ${budget}`);
for (const asset of assets) console.log(`  ${asset.gzip.toString().padStart(7)}  ${asset.name}`);
if (gzip > budget) {
  console.error(`main entry gzip ${gzip} exceeds ${budget}`);
  process.exit(1);
}
