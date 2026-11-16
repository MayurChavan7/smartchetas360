import fs from "node:fs";
import path from "node:path";

// Change this to the path of your HTML file
const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error("Usage: node extract-geo.mjs <path-to-html>");
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");
const m = html.match(/const INDIA_GEO\s*=\s*(\{[\s\S]*?\})\s*;\s*const BRIDGE/);
if (!m) {
  console.error("Could not find INDIA_GEO in the HTML file.");
  process.exit(1);
}

const geo = JSON.parse(m[1]);
const out = path.join("src", "data", "indiaGeo.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(geo));
console.log(`Wrote ${out} with ${geo.features.length} features`);