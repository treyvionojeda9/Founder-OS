/**
 * Serves client/dist with gzip for text and a SPA fallback.
 * The perf budget hits this instead of `vite preview`, which does not compress.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const dist = new URL("../dist/", import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, rel);
  if (decoded.endsWith("/") || !extname(file)) {
    const index = join(file, "index.html");
    if (existsSync(index)) file = index;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  return file;
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html is missing. Run npm run build first.");
  process.exit(1);
}

const server = createServer((req, res) => {
  const file = resolveFile(req.url || "/");
  const body = readFileSync(file);
  const ext = extname(file);
  const headers = {
    "content-type": types[ext] || "application/octet-stream",
    "cache-control": "no-cache",
  };
  const compressible = [".html", ".js", ".css", ".svg", ".json"].includes(ext);
  if (compressible && String(req.headers["accept-encoding"] || "").includes("gzip")) {
    const gz = gzipSync(body, { level: 6 });
    res.writeHead(200, { ...headers, "content-encoding": "gzip", "content-length": String(gz.length) });
    res.end(gz);
    return;
  }
  res.writeHead(200, { ...headers, "content-length": String(body.length) });
  res.end(body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`gzip preview http://127.0.0.1:${port}`);
});
