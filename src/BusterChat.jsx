import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "https://badger-transit-dawn-darkness-55.fly.dev";

export default function BusterChat() {
  // In-memory only session id: survives within the tab while React component is mounted,
  // resets on full page refresh (no localStorage/sessionStorage).
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  const [messages, setMessages] = useState([
    { role: "assistant", text: "Where ya heading?" }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState(null);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 }
    );
  }, []);

  async function send(text) {
    if (!text.trim()) return;

    if (!geo) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "I need location access to route you (for now). Enable it and try again." }
      ]);
      return;
    }

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/api/buster/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId, // in-memory id
        },
        body: JSON.stringify({
          message: text,
          user_location: geo,
        }),
      });

      const data = await resp.json();

      if (!data.success) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.error || "Something went wrong." }
        ]);
        return;
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.assistant_message, cards: data.cards }
      ]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Network error talking to Buster." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Buster (Experimental)</h2>

      <div style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 12,
        height: 520,
        overflowY: "auto",
        background: "#fff"
      }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 10
          }}>
            <div style={{
              maxWidth: "85%",
              padding: "10px 12px",
              borderRadius: 12,
              background: m.role === "user" ? "#e8f0fe" : "#f3f3f3",
              whiteSpace: "pre-wrap"
            }}>
              {m.text}

              {/* Optional cards */}
              {m.cards?.type === "route_options" && (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {m.cards.options?.map((opt, i) => (
                    <div key={opt.id || i} style={{
                      border: "1px solid #ddd",
                      borderRadius: 12,
                      padding: 10,
                      background: "#fff"
                    }}>
                      <div style={{ fontWeight: 700 }}>{opt.label} (Option {i + 1})</div>
                      <div>Transfers: {opt.transfers}</div>
                      <div>Walk: {Math.round((opt.walk_m || 0) / 1609.34 * 10) / 10} mi</div>
                      <div>Total: {Math.round((opt.duration_s || 0) / 60)} min</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "#333" }}>
                        Board at: {opt.board_stop || "—"}
                      </div>
                      <button
                        onClick={() => send(i === 0 ? "first one" : "second one")}
                        style={{ marginTop: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
                      >
                        Pick option {i + 1}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {m.cards?.type === "route_selected" && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fff", border: "1px solid #ddd" }}>
                  <div style={{ fontWeight: 700 }}>Selected route</div>
                  <div>Transfers: {m.cards.selected?.transfers}</div>
                  <div>Total: {Math.round((m.cards.selected?.duration_s || 0) / 60)} min</div>
                  <div>Board: {m.cards.selected?.board_stop || "—"}</div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        style={{ display: "flex", gap: 8, marginTop: 10 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={loading ? "Thinking..." : "Type a destination or 'second one'..."}
          disabled={loading}
          style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
        />
        <button disabled={loading} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc" }}>
          Send
        </button>
      </form>
    </div>
  );
}
