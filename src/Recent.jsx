// src/Recent.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, NavLink} from "react-router-dom";
import "./Stops.css";

const STORAGE_KEY = "bt_recent_stops";

function formatLastVisited(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

export default function RecentPage() {
  const [recentStops, setRecentStops] = useState([]);

  // read from localStorage once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setRecentStops([]);
        return;
      }

      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];

      // sort newest → oldest just in case
      parsed.sort((a, b) => {
        const da = new Date(a.lastVisited || 0).getTime();
        const db = new Date(b.lastVisited || 0).getTime();
        return db - da;
      });

      setRecentStops(parsed);
    } catch (e) {
      console.error("Failed to read recent stops", e);
      setRecentStops([]);
    }
  }, []);

  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="stop-root">
      <div className="stop-inner">
        {/* HEADER */}
        <header className="home-header">
          <div className="home-header-top">
            <Link to="/" className="home-logo" aria-label="BadgerTransit Home">
              <div className="home-logo-square" aria-hidden="true" />
              <div className="home-wordmark">
                <div className="home-logo-text-main">badger</div>
                <div className="home-logo-text-sub">transit</div>
              </div>
            </Link>

            <div className="home-clock" aria-live="off">
              <div className="home-clock-date">{dateString}</div>
              <div className="home-clock-time">{timeString}</div>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="home-nav" aria-label="Primary navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/recent"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Recent
            </NavLink>

            <NavLink
              to="/map"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Map
            </NavLink>

            <NavLink
              to="/routes"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Routes
            </NavLink>
          </nav>
        </header>

        {/* PAGE TITLE BAR */}
        <section className="stop-header-bar" aria-labelledby="recent-title">
          <div className="stop-header-left">
            <div className="stop-header-text">
              <h1 id="recent-title" className="stop-header-title">
                Recent stops
              </h1>
              <div className="stop-header-subtitle">
                Stops you&apos;ve viewed recently
              </div>
            </div>
          </div>
        </section>

        {/* COLUMN LABELS */}
        <div className="stop-label-row" role="presentation">
          <span>Stop</span>
          <span>Last visited</span>
        </div>

        {/* RECENT STOP CARDS */}
        <section className="stop-cards" aria-labelledby="recent-stops-list">
          <h2 id="recent-stops-list" className="visually-hidden">
            Recently Visited Stops
          </h2>

          {recentStops.length === 0 && (
            <div className="stop-empty" role="status">
              You haven&apos;t viewed any stops yet.
            </div>
          )}

          {recentStops.map((stop) => (
            <Link
              key={stop.stopId}
              to={`/stop/${stop.stopId}`}
              className="recent-stop-link"
              aria-label={`View stop ${stop.stopId}, ${stop.name || `Stop ${stop.stopId}`}, last visited ${formatLastVisited(stop.lastVisited)}`}
            >
              <article className="bus-card">
                {/* Stop ID badge */}
                <div
                  className="bus-card-route"
                  style={{ backgroundColor: "#111827" }}
                  aria-label={`Stop ${stop.stopId}`}
                >
                  {stop.stopId}
                </div>

                <div className="bus-card-main">
                  <div className="bus-card-left">
                    <div className="bus-card-top">
                      <div className="bus-card-destination">
                        {stop.name || `Stop ${stop.stopId}`}
                      </div>
                      <div className="bus-card-times">
                        <div className="bus-card-eta">
                          {formatLastVisited(stop.lastVisited)}
                        </div>
                      </div>
                    </div>

                    <div className="bus-card-bottom">
                      <div className="bus-card-occupancy">
                        {/* empty dot row just to keep layout consistent */}
                        <div className="bus-card-dots" aria-hidden="true">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="occ-dot" />
                          ))}
                        </div>
                        <span className="bus-card-sub">
                          Tap to view arrivals
                        </span>
                      </div>
                      <div className="bus-card-clock" />
                    </div>
                  </div>

                  <div className="bus-card-right">
                    <span className="bus-card-track-label" aria-hidden="true">
                      View stop
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </section>

        {/* FOOTER */}
        <footer className="home-footer routes-footer">
          <div className="home-footer-left">
            <div className="home-logo-small-square" aria-hidden="true" />
            <span className="home-footer-brand">badger transit</span>
          </div>
          <div className="home-footer-links">
            <a 
              href="mailto:support@badgertransit.com?subject=Bug Report" 
              className="home-footer-link"
            >
              report a bug
            </a>
            <a 
              href="/terms" 
              className="home-footer-link"
            >
              terms of service
            </a>
          </div>
          <div className="home-footer-meta">badgertransit ©2026</div>
        </footer>
      </div>
    </main>
  );
}