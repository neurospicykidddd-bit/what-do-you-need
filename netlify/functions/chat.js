import { generateReply } from "../../api/_respond.js";

// netlify serverless function. the frontend still fetches /api/chat — the
// redirect in netlify.toml maps that to /.netlify/functions/chat. the key is
// read from the ANTHROPIC_API_KEY env var set in netlify's site settings, so it
// never reaches the browser.
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", Allow: "POST" },
      body: JSON.stringify({ error: "method not allowed" }),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "bad request body" }),
    };
  }

  // netlify sets x-nf-client-connection-ip to the real client ip; fall back to
  // the first hop of x-forwarded-for. used for best-effort rate limiting.
  const headers = event.headers || {};
  const fwd = headers["x-forwarded-for"];
  const ip =
    headers["x-nf-client-connection-ip"] ||
    (typeof fwd === "string" ? fwd.split(",")[0].trim() : null) ||
    "unknown";

  const { status, body } = await generateReply(
    parsed?.messages,
    process.env.ANTHROPIC_API_KEY,
    ip
  );

  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
};
