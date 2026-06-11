// local-only dev backend for `/api`. vercel runs the functions in /api itself,
// so this file is never used in production — it just gives `vite dev` something
// to proxy to. reads ANTHROPIC_API_KEY from .env (loaded below).
import http from "node:http";
import fs from "node:fs";
import handler from "./api/chat.js";

// minimal .env loader so the key is available without extra deps.
try {
  const env = fs.readFileSync(new URL("./.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // no .env file — that's fine if the var is already in the environment.
}

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.url !== "/api/chat") {
    res.statusCode = 404;
    return res.end("not found");
  }

  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    req.body = raw;
    // shim express-style res helpers onto the node response.
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (obj) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(obj));
      return res;
    };
    handler(req, res);
  });
});

server.listen(PORT, () => {
  console.log(`[dev api] listening on http://localhost:${PORT}`);
});
