// regenerates public/og.png — the social-share preview card (1200x630).
// run: npm run og   (only needed when you change the design below)
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const W = 1200;
const H = 630;

// on-brand: dark canvas, lowercase mono title, cream ink, accent cursor,
// lots of negative space. mirrors the live site.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0e0e0c"/>
  <g font-family="DejaVu Sans Mono, monospace">
    <text x="100" y="300" font-size="84" fill="#e8e4d8" letter-spacing="-1">what do you need?<tspan fill="#d7c47a">_</tspan></text>
    <text x="104" y="362" font-size="30" fill="#8a877c">tell us whatever's bothering you.</text>
    <text x="104" y="404" font-size="30" fill="#8a877c">get actionable advice that actually works.</text>
  </g>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: W },
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans Mono" },
  background: "#0e0e0c",
});

const png = resvg.render().asPng();
const out = fileURLToPath(new URL("../public/og.png", import.meta.url));
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
