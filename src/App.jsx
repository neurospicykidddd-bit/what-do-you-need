import { useEffect, useRef, useState } from "react";

// pool of example prompts. we show a few at random each load to keep the
// screen clean but feel alive.
const EXAMPLE_POOL = [
  "i can't sleep",
  "i keep checking my phone",
  "i think i'm burnt out",
  "everyone's annoying me today",
  "i think i need a fresh start",
  "i keep starting things and not finishing them",
  "why does everyone seem to have it figured out",
  "i've been 'about to start' for three hours",
  "i can't stop comparing myself to strangers online",
];

function pickExamples(n) {
  const shuffled = [...EXAMPLE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function App() {
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [examples] = useState(() => pickExamples(4));

  const inputRef = useRef(null);
  const endRef = useRef(null);

  const started = messages.length > 0;

  useEffect(() => {
    if (started) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, thinking, started]);

  // grow the textarea to fit its content (wrapping), capped by max-height in css.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    setError("");
    const next = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.reply) {
        setError(data.error || `something broke on my end (${res.status}). try again.`);
        setThinking(false);
        return;
      }

      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("can't reach me right now. check your connection, then try again.");
    } finally {
      setThinking(false);
      // refocus so follow-ups feel immediate.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    send(input);
  }

  // download the conversation as a plain-text transcript.
  function saveTranscript() {
    if (!messages.length) return;
    const now = new Date();
    const lines = ["what do you need?", now.toLocaleString(), ""];
    for (const m of messages) {
      lines.push(`${m.role === "user" ? "you" : "it"}: ${m.content}`, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `what-do-you-need-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`app ${started ? "started" : "intro"}`}>
      <button
        className="help"
        type="button"
        aria-label="what is this"
        aria-expanded={showAbout}
        onClick={() => setShowAbout((v) => !v)}
      >
        ?
      </button>
      {showAbout && (
        <div className="about" role="dialog" aria-label="what is this">
          <p>
            not a search box. type whatever's bothering you, and it names the
            real thing and hands you the dumb, true move.
          </p>
        </div>
      )}

      <main className="stage">
        {!started && (
          <div className="hero">
            <h1 className="prompt">what do you need?</h1>
            <p className="subhero">cheaper than therapy, but probably blunter too.</p>
          </div>
        )}

        {started && (
          <div className="thread">
            {messages.map((m, i) => (
              <div key={i} className={`turn ${m.role}`}>
                {m.role === "user" && <span className="who">you</span>}
                <p className="bubble">{m.content}</p>
              </div>
            ))}
            {thinking && (
              <div className="turn assistant">
                <p className="bubble thinking">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        <form className="composer" onSubmit={onSubmit}>
          <textarea
            ref={inputRef}
            className="field"
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // enter sends; shift+enter inserts a newline.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={started ? "say more" : "type whatever's bothering you"}
            autoFocus
            autoComplete="off"
            spellCheck="false"
            aria-label="what do you need"
          />
          <button
            className="go"
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="send"
          >
            →
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {!started && (
          <div className="chips">
            {examples.map((ex) => (
              <button
                key={ex}
                className="chip"
                type="button"
                onClick={() => {
                  setInput(ex);
                  inputRef.current?.focus();
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="foot">
        {started ? (
          <span>
            nothing's saved here.{" "}
            <button className="save" type="button" onClick={saveTranscript}>
              save this
            </button>
          </span>
        ) : (
          <span>no logins. no history. resets on refresh.</span>
        )}
      </footer>
    </div>
  );
}
