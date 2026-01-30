// src/components/BusSheet.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./BusSheet.css"; // optional external stylesheet if you prefer

const routeColors = {
  A2: "#FF5810", A1: "#FF5810", A: "#FF5810", B: "#9ACE00", C: "#0099FF",
  D1: "#FBB411", D2: "#FBB411", E: "#FFD133", F: "#7860FF", G: "#33FFF3",
  H: "#FF8F33", J: "#337BFF", L: "#33FF8A", O: "#FFC733", P: "#33C1A8",
  R1: "#CC3FFF", S: "#6F61FF", W: "#61C1FF", 28: "#FBB411", 38: "#FF5900",
  55: "#61FFA8", 60: "#FF5733", 61: "#33C1FF", 62: "#33FF57", 63: "#FF33A8",
  64: "#FFD133", 65: "#8D33FF", 75: "#33FFF3", 80: "#FF8F33", 84: "#337BFF",
};

function formatDestination(route, destination) {
  const toMatch = (destination || "").match(/^([A-Z])(\d)\s+to\s+(.+)/i);
  if (toMatch && [toMatch[1]].includes(route))
    return { route: `${toMatch[1]}${toMatch[2]}`, destination: toMatch[3].trim() };
  return { route, destination };
}

function getCountdown(rawMinutes) {
  if (rawMinutes == null || rawMinutes === "Unknown") return "—";
  if (rawMinutes <= 0) return "Arriving";
  return `${rawMinutes} min`;
}

function renderOccupancyBlocks(occupancy) {
  const map = {
    EMPTY: 1,
    MANY_SEATS: 2,
    HALF_EMPTY: 3,
    FEW_SEATS: 4,
    STANDING_ROOM: 5,
    FULL: 5,
  };
  const filled = map[(occupancy || "").toUpperCase()] ?? 1;
  return Array.from({ length: 5 }, (_, i) => (
    <div
      key={i}
      className={`occ-block ${i < filled ? "filled" : "empty"}`}
    />
  ));
}

function BusCard({ bus }) {
  const { route, destination } = formatDestination(bus.route, bus.destination);
  const routeColor = routeColors[route] || "#FFD60A";
  return (
    <div className="bus-card">
      <div className="bus-card-top">
        <div className="left">
          <div className="route-badge" style={{ backgroundColor: routeColor }}>
            {route}
          </div>
          <div className="destination">{destination}</div>
        </div>
        <div className="countdown">{getCountdown(bus.eta_minutes)}</div>
      </div>
      <div className="bus-card-bottom">
        <div className="pills">
          <div className="pill">{bus.stops_away != null ? `${bus.stops_away} stop${bus.stops_away === 1 ? "" : "s"} away` : "—"}</div>
          <div className="pill">{bus.predicted_time}</div>
        </div>
        <div className="occupancy">
          <span className="occ-label">Occupancy:</span>
          <div className="occ-blocks">{renderOccupancyBlocks(bus.occupancy)}</div>
        </div>
      </div>
    </div>
  );
}

export default function BusSheet({ stopId, stopName, busData = [], loading, onClose, onRefresh }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => { setVisible(true); }, [stopId]);

  return (
    <div className={`bus-sheet ${visible ? "open" : ""}`}>
      <div className="sheet-header">
        <div className="sheet-handle" />
        <div className="sheet-header-row">
          <div className="stop-info">
            <h3>Stop #{stopId}</h3>
            <p>{stopName}</p>
          </div>
          <div className="actions">
            <button className="refresh-btn" onClick={onRefresh}>⟳</button>
            <button className="close-btn" onClick={() => { setVisible(false); onClose?.(); }}>✕</button>
          </div>
        </div>
      </div>

      <div className="sheet-content">
        {loading ? (
          <div className="loading">Loading …</div>
        ) : busData.length === 0 ? (
          <div className="empty">No upcoming buses</div>
        ) : (
          busData.map((bus, idx) => <BusCard key={idx} bus={bus} />)
        )}
      </div>
    </div>
  );
}
