import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "https://badger-transit-dawn-darkness-55.fly.dev";

function getSessionId() {
  let sid = localStorage.getItem("buster_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("buster_sid", sid);
  }
  return sid;
}

export default function BusterTest() {
  const sid = useMemo(() => getSessionId(), []);
  const [loc, setLoc] = useState(null);
  const [msg, setMsg] = useState("");
  const [resp, setResp] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => setErr("Geolocation denied or unavailable: " + e.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  async function send() {
    setErr(null);
    setResp(null);
    if (!loc) return setErr("No location yet.");

    const r = await fetch(`${API_BASE}/api/buster/route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sid,
      },
      body: JSON.stringify({
        message: msg,
        user_location: loc,
      }),
    });

    const data = await r.json();
    if (!data.success) {
      setErr(data.error + (data.detail ? ` — ${data.detail}` : ""));
    } else {
      setResp(data);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h2>Buster Route Test</h2>

      {!loc ? (
        <p>Getting your location…</p>
      ) : (
        <p>
          Your location: {loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder='Try "Bakke" then "second one"'
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={send} style={{ padding: "10px 14px" }}>
          Send
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {resp?.type === "route_options" && (
        <div style={{ marginTop: 16 }}>
          <h3>Destination</h3>
          <p>
            {resp.destination?.name} — {resp.destination?.address}
          </p>

          <h3>Options</h3>
          {resp.options.map((o) => (
            <div
              key={o.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <b>{o.label}</b>
              <div>Duration: {Math.round((o.duration_s ?? 0) / 60)} min</div>
              <div>Walk: {Math.round((o.walk_m ?? 0) * 3.28084)} ft</div>
              <div>Transfers: {o.transfers}</div>
              <div>Board: {o.board_stop || "—"}</div>

              <details style={{ marginTop: 8 }}>
                <summary>Steps</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(o.steps, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}

      {resp?.type === "route_selected" && (
        <div style={{ marginTop: 16 }}>
          <h3>Selected</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(resp.selected, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
