import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "./_rateLimit.js";

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

// core logic, platform-agnostic. takes the raw messages array and an api key,
// returns { status, body } where body is a plain object to be json-serialized.
// the vercel function (api/chat.js) and the netlify function
// (netlify/functions/chat.js) are both thin adapters around this.
export async function generateReply(messages, apiKey, ip) {
  if (!apiKey) {
    return {
      status: 500,
      body: { error: "i'm not plugged in right now. the key's missing on my end." },
    };
  }

  const limit = rateLimit(ip);
  if (!limit.ok) {
    return {
      status: 429,
      body: {
        error: "okay, slow down. too many in a row. give it a minute.",
        retryAfter: limit.retryAfter,
      },
    };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, body: { error: "messages array is required" } };
  }

  // keep the shape strict: only role + string content, user/assistant only.
  const cleaned = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: String(m.content ?? "") }));

  if (cleaned.length === 0 || cleaned[0].role !== "user") {
    return {
      status: 400,
      body: { error: "conversation must start with a user message" },
    };
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

    return { status: 200, body: { reply } };
  } catch (err) {
    const status =
      err?.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    console.error("anthropic error:", err?.message || err);
    return {
      status,
      body: { error: "something broke. on my end, not yours. try again in a sec." },
    };
  }
}
