// src/SmartLaunch.jsx
import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";

import "./Home.css";
import "./Map.css";
import "./components/SmartLaunch.css";
import { loadSmartLaunchRules, saveSmartLaunchRules } from "./utils/smartLaunch";
import MapView from "./components/MapView";

// helper: approximate meters per pixel for web mercator
function metersPerPixelAtLat(zoom, lat) {
  const EARTH_CIRCUMFERENCE = 40075016.686; // meters
  const latRad = (lat * Math.PI) / 180;
  return (
    (Math.cos(latRad) * EARTH_CIRCUMFERENCE) /
    Math.pow(2, zoom + 8) // 256 * 2^zoom => 2^(zoom+8)
  );
}

export default function SmartLaunchPage() {
  const [rules, setRules] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [formError, setFormError] = useState("");

  // form state
  const [stopId, setStopId] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("12:00");

  // map view state for creation / editing
  const [viewState, setViewState] = useState({
    longitude: -89.4012,
    latitude: 43.0731,
    zoom: 15,
  });

  // fixed circle size in pixels
  const CIRCLE_RADIUS_PX = 80;

  // load rules on mount
  useEffect(() => {
    setRules(loadSmartLaunchRules());
  }, []);

  const resetFormToDefaults = () => {
    setStopId("");
    setStartTime("07:00");
    setEndTime("12:00");
    setFormError("");
    setViewState({
      longitude: -89.4012,
      latitude: 43.0731,
      zoom: 15,
    });
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingRuleId(null);
    resetFormToDefaults();
  };

  const handleStartEdit = (rule) => {
    setIsCreating(true);
    setEditingRuleId(rule.id);

    setStopId(rule.stopId ?? "");
    setStartTime(rule.startTime ?? "07:00");
    setEndTime(rule.endTime ?? "12:00");
    setFormError("");

    setViewState((prev) => ({
      ...prev,
      longitude: rule.center?.lon ?? prev.longitude,
      latitude: rule.center?.lat ?? prev.latitude,
      zoom: prev.zoom ?? 15,
    }));
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setEditingRuleId(null);
    setFormError("");
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    if (!stopId.trim()) {
      setFormError("Please enter a stop ID.");
      return;
    }

    const centerLat = viewState.latitude;
    const centerLon = viewState.longitude;
    const mpp = metersPerPixelAtLat(viewState.zoom, centerLat);
    const radiusMeters = mpp * CIRCLE_RADIUS_PX;

    const commonData = {
      name: `SmartLaunch for stop ${stopId.trim()}`,
      stopId: stopId.trim(),
      center: { lat: centerLat, lon: centerLon },
      radiusMeters,
      startTime: startTime || null,
      endTime: endTime || null,
    };

    let updated;

    if (editingRuleId) {
      updated = rules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              ...commonData,
            }
          : r
      );
    } else {
      const newRule = {
        id: String(Date.now()),
        enabled: true,
        ...commonData,
      };
      updated = [...rules, newRule];
    }

    setRules(updated);
    saveSmartLaunchRules(updated);

    setIsCreating(false);
    setEditingRuleId(null);
    setFormError("");
  };

  const handleToggleEnabled = (id) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    setRules(updated);
    saveSmartLaunchRules(updated);
  };

  const handleDelete = (id) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    saveSmartLaunchRules(updated);

    if (editingRuleId === id) {
      setIsCreating(false);
      setEditingRuleId(null);
    }
  };

  const isEditing = Boolean(editingRuleId);
  
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
    <main className="home-root">
      <div className="home-phone">
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

        {/* MAIN CONTENT */}
        <section className="home-hero" aria-labelledby="smartlaunch-title">
          <h1 id="smartlaunch-title" className="home-hero-title">
            SmartLaunch Automations
          </h1>
          <p className="home-notice-body">
            Automatically open a stop when you&apos;re in a specific place and time window.
          </p>
        </section>

        {/* Existing rules */}
        <section className="home-card-grid" aria-labelledby="existing-rules-title">
          <h2 id="existing-rules-title" className="visually-hidden">
            Your SmartLaunch Automations
          </h2>

          {rules.length === 0 && (
            <p className="home-notice-body" role="status">
              No SmartLaunch automations yet. Create one below.
            </p>
          )}

          {rules.map((rule) => (
            <article 
              key={rule.id} 
              className="home-card smartlaunch-rule-card"
              aria-label={`SmartLaunch automation for stop ${rule.stopId}, ${rule.enabled ? 'enabled' : 'disabled'}`}
            >
              <div className="smartlaunch-rule-content">
                <h3 className="home-card-title">{rule.name}</h3>
                <dl className="smartlaunch-rule-details">
                  <dt className="visually-hidden">Stop ID</dt>
                  <dd>
                    <strong>Stop:</strong> {rule.stopId}
                  </dd>
                  
                  <dt className="visually-hidden">Active time window</dt>
                  <dd>
                    <strong>Time:</strong>{" "}
                    {rule.startTime && rule.endTime
                      ? `${rule.startTime}–${rule.endTime}`
                      : "All day"}
                  </dd>
                  
                  <dt className="visually-hidden">Status</dt>
                  <dd>
                    <strong>Status:</strong> {rule.enabled ? "Enabled" : "Disabled"}
                  </dd>
                </dl>

                <div className="smartlaunch-rule-actions">
                  <button
                    type="button"
                    className="smartlaunch-action-btn"
                    onClick={() => handleToggleEnabled(rule.id)}
                    aria-label={rule.enabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="smartlaunch-action-btn"
                    onClick={() => handleStartEdit(rule)}
                    aria-label={`Edit ${rule.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="smartlaunch-action-btn smartlaunch-delete-btn"
                    onClick={() => handleDelete(rule.id)}
                    aria-label={`Delete ${rule.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* New / Edit rule form */}
        <section className="home-notice secondary" aria-labelledby="create-section-title">
          <h2 id="create-section-title" className="visually-hidden">
            {isCreating ? (isEditing ? "Edit Automation" : "Create New Automation") : "Create Automation"}
          </h2>

          {!isCreating ? (
            <button
              type="button"
              className="smartlaunch-create-btn"
              onClick={handleStartCreate}
            >
              + New SmartLaunch
            </button>
          ) : (
            <form onSubmit={handleSave} aria-labelledby="form-title">
              <h3 id="form-title" className="home-notice-title">
                {isEditing ? "Edit SmartLaunch" : "Create SmartLaunch"}
              </h3>

              {formError && (
                <div 
                  className="form-error" 
                  role="alert" 
                  aria-live="assertive"
                >
                  {formError}
                </div>
              )}

              <div className="form-field">
                <label htmlFor="stop-id-input" className="form-label">
                  Stop ID:
                </label>
                <input
                  id="stop-id-input"
                  type="text"
                  value={stopId}
                  onChange={(e) => {
                    setStopId(e.target.value);
                    setFormError("");
                  }}
                  className="form-input"
                  required
                  aria-required="true"
                  aria-invalid={formError ? "true" : "false"}
                  aria-describedby={formError ? "stop-id-error" : undefined}
                />
                {formError && (
                  <span id="stop-id-error" className="visually-hidden">
                    {formError}
                  </span>
                )}
              </div>

              <fieldset className="form-fieldset">
                <legend className="form-legend">Active time window</legend>
                
                <div className="form-time-group">
                  <div className="form-field">
                    <label htmlFor="start-time-input" className="form-label">
                      From:
                    </label>
                    <input
                      id="start-time-input"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="end-time-input" className="form-label">
                      To:
                    </label>
                    <input
                      id="end-time-input"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </fieldset>

              <p className="home-notice-body">
                Drag and zoom the map so the red circle covers the area where you want this automation to trigger.
              </p>

              <div className="map-container">
                <MapView
                  viewState={viewState}
                  onMove={(evt) => setViewState(evt.viewState)}
                  aria-label="Interactive map for setting SmartLaunch trigger location"
                />

                {/* Fixed circle overlay */}
                <div
                  className="smartlaunch-circle-overlay"
                  role="img"
                  aria-label={`Trigger radius circle, approximately ${Math.round(metersPerPixelAtLat(viewState.zoom, viewState.latitude) * CIRCLE_RADIUS_PX)} meters`}
                  style={{
                    width: `${CIRCLE_RADIUS_PX * 2}px`,
                    height: `${CIRCLE_RADIUS_PX * 2}px`,
                    marginLeft: `-${CIRCLE_RADIUS_PX}px`,
                    marginTop: `-${CIRCLE_RADIUS_PX}px`,
                  }}
                />
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="smartlaunch-action-btn smartlaunch-primary-btn"
                >
                  {isEditing ? "Save changes" : "Save SmartLaunch"}
                </button>
                <button
                  type="button"
                  className="smartlaunch-action-btn"
                  onClick={handleCancelCreate}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* FOOTER */}
        <footer className="home-footer">
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