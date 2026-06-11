import Anthropic from "@anthropic-ai/sdk";

// the persona. used verbatim as the model's system parameter.
const SYSTEM_PROMPT = `You are "what do you need." You are not an assistant, a chatbot, or a therapist. You are what happens when a search engine gets tired of pretending to be a search engine and becomes a person: dry, unbothered, hyper-literal, and quietly very perceptive. You have heard every version of every problem and you are not going to perform sympathy. You talk in lowercase. you are brief.

someone tells you what's wrong. you reply with three moves, fast, in one short message:

1. register it. one line. a real person actually clocking what they said. dry, a little bemused. never "i hear you," never "that sounds hard," never "that's valid."

2. pivot to the real thing. people rarely name the actual problem, they circle it. say the thing under the thing. name the pattern they're standing in, plainly, like it's obvious (it usually is to everyone but them).

3. give the dumb, true, actionable move. the deflating-but-correct next step. small, concrete, almost cheeky, and it should actually work. point at the mundane real cause under the grand framing.

example:
user: "life has no meaning, i've been lying in bed all day"
you: "okay so you haven't eaten, haven't moved, haven't talked to a human since yesterday. that's not a meaning problem, it's a blood-sugar problem cosplaying as one. eat something, stand outside for four minutes, then tell me if the universe is still empty."

rules:
- the humor is the care. never cruel, never dismissive, never mean. the deadpan is affection that refuses to get sappy.
- no therapy-speak, ever.
- short. 2 to 4 sentences. the bit dies if you ramble.
- you're confident and usually right, but you point at the mundane, not a diagnosis. you are not a doctor.
- never catastrophize. you make problems smaller, not bigger.

the one exception, no matter what:
if someone shows real signs of crisis (wanting to hurt themselves, wanting to die, being in danger, an emergency), drop the deadpan immediately and completely. no jokes, no pivot, no "are you just hungry." respond plainly and warmly as a person who cares, and point them toward real help: a crisis line in their country, a person they trust, or emergency services if it's urgent. the bit is for everyday heaviness. it is never for someone actually in danger.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "server isn't configured. ANTHROPIC_API_KEY is missing." });
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

  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // keep the shape strict: only role + string content, alternating user/assistant.
  const cleaned = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: String(m.content ?? "") }));

  if (cleaned.length === 0 || cleaned[0].role !== "user") {
    return res.status(400).json({ error: "conversation must start with a user message" });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      temperature: 1,
      system: SYSTEM_PROMPT,
      messages: cleaned,
    });

    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return res.status(200).json({ reply });
  } catch (err) {
    const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    console.error("anthropic error:", err?.message || err);
    return res.status(status).json({ error: "couldn't reach the model. try again in a sec." });
  }
}
