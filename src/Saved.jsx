// src/SavedPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, NavLink } from "react-router-dom";
import "./Stops.css";

const STORAGE_KEY = "bt_saved_stops";

function formatSavedDate(iso) {
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

export default function SavedPage() {
  const navigate = useNavigate();
  const [savedStops, setSavedStops] = useState([]);

  // Load saved stops from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSavedStops([]);
        return;
      }

      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];

      // Sort newest first
      parsed.sort((a, b) => {
        const da = new Date(a.savedAt || 0).getTime();
        const db = new Date(b.savedAt || 0).getTime();
        return db - da;
      });

      setSavedStops(parsed);
    } catch (e) {
      console.error("Failed to read saved stops", e);
      setSavedStops([]);
    }
  }, []);

  const handleDelete = (id, e) => {
    e.preventDefault();
    e.stopPropagation();

    // TODO: Replace with accessible modal dialog
    if (!window.confirm("Delete this saved stop/group?")) return;

    try {
      const updated = savedStops.filter((item) => item.id !== id);
      setSavedStops(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleNavigate = (item) => {
    const [primary, ...others] = item.stopIds;
    const stopsParam = others.length > 0 ? `?stops=${others.join(',')}` : '';
    navigate(`/stop/${primary}${stopsParam}`);
  };

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
        <section className="stop-header-bar" aria-labelledby="saved-title">
          <div className="stop-header-left">
            <div className="stop-header-text">
              <h1 id="saved-title" className="stop-header-title">
                Saved stops
              </h1>
              <div className="stop-header-subtitle">
                Your saved stops and groups
              </div>
            </div>
          </div>
        </section>

        {/* COLUMN LABELS */}
        <div className="stop-label-row" role="presentation">
          <span>Stop</span>
          <span>Saved</span>
        </div>

        {/* SAVED STOP CARDS */}
        <section className="stop-cards" aria-labelledby="saved-stops-list">
          <h2 id="saved-stops-list" className="visually-hidden">
            Your Saved Stops and Groups
          </h2>

          {savedStops.length === 0 && (
            <div className="stop-empty" role="status">
              You haven&apos;t saved any stops yet.
            </div>
          )}

          {savedStops.map((item) => (
            <article 
              key={item.id} 
              className="bus-card saved-stop-card"
              aria-label={`${item.name}, ${item.isGroup ? `group with ${item.stopIds.length} stops` : `stop ${item.stopIds[0]}`}, saved on ${formatSavedDate(item.savedAt)}`}
            >
              {/* Left pill showing stop count or single stop ID */}
              <div
                className="bus-card-route"
                style={{ 
                  backgroundColor: item.isGroup ? "#8B5CF6" : "#111827",
                  minWidth: item.isGroup ? "60px" : "50px",
                  fontSize: item.isGroup ? "12px" : "20px"
                }}
                aria-label={item.isGroup ? `Group with ${item.stopIds.length} stops` : `Stop ${item.stopIds[0]}`}
              >
                {item.isGroup 
                  ? `${item.stopIds.length} stops`
                  : item.stopIds[0]
                }
              </div>

              <div className="bus-card-main">
                <div className="bus-card-left">
                  <div className="bus-card-top">
                    <div className="bus-card-destination">
                      {item.name}
                      {item.isGroup && (
                        <span 
                          className="group-badge"
                          aria-label="This is a group"
                        >
                          GROUP
                        </span>
                      )}
                    </div>
                    <div className="bus-card-times">
                      <div className="bus-card-eta">
                        {formatSavedDate(item.savedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="bus-card-bottom">
                    <div className="bus-card-occupancy">
                      <div className="bus-card-dots" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className="occ-dot" />
                        ))}
                      </div>
                      <span className="bus-card-sub">
                        {item.isGroup
                          ? `Stops: ${item.stopIds.join(', ')}`
                          : "Tap to view arrivals"
                        }
                      </span>
                    </div>
                    <div className="bus-card-clock" />
                  </div>
                </div>

                <div className="bus-card-right">
                  <button
                    className="bus-card-track"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(item);
                    }}
                    style={{ marginRight: "8px" }}
                    aria-label={`View ${item.name}`}
                  >
                    View
                  </button>
                  <button
                    className="bus-card-track bus-card-delete"
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    aria-label={`Delete ${item.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
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