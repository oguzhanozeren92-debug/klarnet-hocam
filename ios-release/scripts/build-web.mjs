// Bundle the existing production Klarnet Hocam web app into the iOS IPA.
// The download is performed at build time; the app then runs from local files.
import fs from "node:fs/promises";
import path from "node:path";

const out = path.resolve("www");
const sources = [
  "https://klarnet-hocam.vercel.app/",
  "https://klarnet-hocam-pvdli1rrr-oguzhanozeren92-1273.vercel.app/"
];
const names = ["index.html", "premium.js", "premium.css", "polish.css"];
const requiredMinimumBytes = { "index.html": 1000, "premium.js": 2000, "premium.css": 2000, "polish.css": 1000 };

async function download(base, name) {
  const url = new URL(name === "index.html" ? "" : name, base);
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache", "User-Agent": "KlarnetHocam-iOS-build/1.0" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(name + ": HTTP " + response.status + " from " + url);
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") < requiredMinimumBytes[name])
    throw new Error(name + ": insufficient app content; refusing to package a partial site");
  if (name === "index.html" && (!body.includes('id="screen"') || !body.includes("Klarnet Hocam")))
    throw new Error("Not the Klarnet Hocam app index");
  if (name.endsWith(".js") && body.trimStart().startsWith("<"))
    throw new Error("JavaScript request returned HTML (possibly a Vercel access page)");
  if (name.endsWith(".css") && body.trimStart().startsWith("<"))
    throw new Error("CSS request returned HTML (possibly a Vercel access page)");
  return body;
}
let bundle, lastError;
for (const base of sources) {
  try {
    const candidate = {};
    for (const name of names) candidate[name] = await download(base, name);
    bundle = candidate;
    console.log("Validated complete web app from:", base);
    break;
  } catch (err) {
    lastError = err;
    console.warn("Web source unavailable:", base, String(err.message));
  }
}
if (!bundle) throw new Error("Cannot produce an iOS build without the actual app: " + lastError);
bundle["index.html"] = bundle["index.html"]
  .replaceAll('href="/premium.css"', 'href="./premium.css"')
  .replaceAll('href="/polish.css"', 'href="./polish.css"')
  .replaceAll('src="/premium.js"', 'src="./premium.js"');
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
for (const [name, content] of Object.entries(bundle))
  await fs.writeFile(path.join(out, name), content, "utf8");
console.log("Klarnet Hocam iOS bundle ready:", names.join(", "));
