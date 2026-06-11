import { generateReply } from "./_respond.js";

// vercel serverless function (also used by the local dev-server.js).
// netlify uses netlify/functions/chat.js instead — both wrap generateReply.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  // body may arrive parsed (vercel) or as a raw string (local node server).
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "bad request body" });
    }
  }

  // first hop in x-forwarded-for is the client; fall back to the socket addr
  // (local dev). used for best-effort per-ip rate limiting.
  const fwd = req.headers?.["x-forwarded-for"];
  const ip =
    (typeof fwd === "string" ? fwd.split(",")[0].trim() : null) ||
    req.headers?.["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";

  const { status, body: payload } = await generateReply(
    body?.messages,
    process.env.ANTHROPIC_API_KEY,
    ip
  );
  return res.status(status).json(payload);
}
