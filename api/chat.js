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

  const { status, body: payload } = await generateReply(
    body?.messages,
    process.env.ANTHROPIC_API_KEY
  );
  return res.status(status).json(payload);
}
