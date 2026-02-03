// src/StopPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import "./Stops.css";
import "./Home.css";

const ROUTE_COLORS = {
  A: "#FF0000",
  A1: "#FF0000",
  A2: "#FF0000",
  B: "#84BC00",
  F: "#2272B5",
  80: "#FF7300",
  81: "#00B7C8",
  82: "#BC009D",
  84: "#C1C800",
  D: "#333366",
  D1: "#333366",
  D2: "#333366",
  C: "#333366",
  C1: "#333366",
  C2: "#333366",
  E: "#2272B5",
  G: "#2272B5",
  H: "#2272B5",
  J: "#2272B5",
  W: "#2272B5",
  28: "#2272B5",
  38: "#2272B5",
  L: "#46AAD1",
  O: "#46AAD1",
  P: "#46AAD1",
  R: "#46AAD1",
  R1: "#46AAD1",
  R2: "#46AAD1",
  S: "#46AAD1",
  55: "#46AAD1",
  60: "#46AAD1",
  65: "#46AAD1",
};

document.body.style.setProperty('--body-bg', '#122C43');

function getRouteColor(code) {
  return ROUTE_COLORS[code] || "#000000";
}

function formatArrivalTime(predicted_time) {
  if (!predicted_time) return "";
  const [, timePart] = predicted_time.split(" ");
  if (!timePart) return "";
  const [hourStr, minuteStr] = timePart.split(":");
  const d = new Date();
  d.setHours(Number(hourStr), Number(minuteStr), 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatStopsAway(pred) {
  if (pred.dyn === 4) {
    return { text: "Drop offs only", hasNumber: false };
  }
  if (pred.stops_away != null) {
    const n = pred.stops_away;
    return { text: `stop${n === 1 ? "" : "s"} away`, number: n, hasNumber: true };
  }
  if (Array.isArray(pred.stops_between) && pred.stops_between.length > 0) {
    const n = pred.stops_between.length;
    return { text: `${n} stop${n === 1 ? "" : "s"} away`, number: n, hasNumber: true };
  }
  if (pred.stops_away === 0) {
    return { text: "Approaching Stop", hasNumber: false };
  }
  if (pred.eta_minutes <= 1) {
    return { text: "At Stop", hasNumber: false };
  }
  if (pred.stops_away === null) {
    return { text: "En Route", hasNumber: false };
  }
  return { text: "Many Stops Away", hasNumber: false };
}

function getOccupancyDots(occupancy) {
  if (occupancy === "N/A") return 5;
  if (occupancy === "EMPTY") return 1;
  if (occupancy === "HALF_EMPTY") return 3;
  if (occupancy === "FULL") return 5;
  return 0;
}

function getOccupancyLabel(occupancy) {
  if (occupancy === "N/A") return "Unknown occupancy";
  if (occupancy === "EMPTY") return "Empty";
  if (occupancy === "HALF_EMPTY") return "Half full";
  if (occupancy === "FULL") return "Full";
  return "Unknown occupancy";
}

function getOccupancyText(occupancy) {
  if (occupancy === "EMPTY") return "Near Empty";
  if (occupancy === "HALF_EMPTY") return "Half-Full";
  if (occupancy === "FULL") return "Crowded";
  return "";
}

function clampPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function truncateStopName(stopName, maxLength = 8) {
  if (!stopName || stopName.length <= maxLength) return stopName;
  return stopName.substring(0, maxLength - 3) + "...";
}

function RegularBusCard({ pred, stopName, stopId, countdown, refreshSeconds }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  // Backend provides aaB (0..100)
  const [timelinePercent, setTimelinePercent] = useState(() => clampPercent(pred.aaB));

  const arrivalLabel = formatArrivalTime(pred.predicted_time);
  const stopsAwayData = formatStopsAway(pred);
  const occDots = getOccupancyDots(pred.occupancy || "");
  const occLabel = getOccupancyLabel(pred.occupancy || "");
  const occText = getOccupancyText(pred.occupancy || "");

  const intermediateStops = pred.stops_between_enriched || [];

  useEffect(() => {
    setTimelinePercent(clampPercent(pred.aaB));
  }, [pred.aaB]);

  const handleViewLocation = () => {
    if (pred.vehicle_id && stopId) {
      navigate(`/map/${stopId}/${pred.vehicle_id}`);
    }
  };

  // Countdown ring math (r=18 => circumference ~ 113.1)
  const CIRC = 113.1;
  const dashOffset = CIRC * (1 - countdown / refreshSeconds);

  return (
    <article
      className={`bus-card ${isExpanded ? "bus-card-expanded" : ""}`}
      aria-label={`Route ${pred.route} to ${pred.destination}, arriving in ${pred.eta_minutes} minutes${
        stopName ? ` at ${stopName}` : ""
      }`}
    >
      <div className="bus-card-main">
        {/* Row 1 */}
        <div className="bus-card-row">
          <div
            className="bus-card-route"
            style={{ backgroundColor: getRouteColor(pred.route) }}
            aria-label={`Route ${pred.route}`}
          >
            {pred.route}
          </div>

          <div className="bus-card-left">
            <div className="bus-card-top">
              <div className="bus-card-destination">{pred.destination}</div>
              <div className="bus-card-times">
                <div className="map-bus-card-times">
                  <div className="min-bus-card-eta" aria-label={`Estimated time: ${pred.eta_minutes} minutes`}>
                    {pred.eta_minutes != null ? `${pred.eta_minutes}` : "--"}
                  </div>
                  <div className="bus-card-eta" aria-label={`Estimated time: ${pred.eta_minutes} minutes`}>
                    {pred.eta_minutes != null ? ` min` : "--"}
                  </div>
                  <div className="network-icon-black"></div>
                </div>
              </div>
            </div>

            <div className="bus-card-bottom">
              <div className="bus-card-stops-away">{pred.away_summary}</div>
              <div className="bus-card-occupancy">
                {occText && <span className="bus-card-occ-text">{occText}</span>}
                <div className="bus-card-dots" aria-label={occLabel}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={"occ-person" + (i < occDots ? " occ-person-filled" : " occ-person-empty")}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bus-card-right">
            <button
              className="bus-card-collapse"
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Collapse bus details" : "Expand bus details"}
              aria-expanded={isExpanded}
            >
              <svg
                className={`collapse-chevron ${isExpanded ? "collapse-chevron-up" : ""}`}
                width="42"
                height="42"
                viewBox="0 0 0 0"
                fill="none"
                aria-hidden="true"
              ></svg>
            </button>
          </div>
        </div>

        {/* Row 2 expanded */}
        {isExpanded && (
          <div className="bus-card-expanded-content">
            <div className="bus-card-expanded-quick-actions">
              <div className="bus-card-expanded-quick-actions-left">
                <div
                  className="card-countdown-timer"
                  role="status"
                  aria-live="polite"
                  aria-label={`Refreshing in ${countdown} seconds`}
                >
                  <svg className="card-countdown-ring" width="34" height="34">
                    <circle className="card-countdown-ring-circle-bg" cx="17" cy="16" r="16" />
                    <circle
                      className="card-countdown-ring-circle"
                      cx="17"
                      cy="16"
                      r="15"
                      style={{
                        strokeDashoffset: `${dashOffset}`,
                      }}
                    />
                  </svg>
                  <span className="card-countdown-number">{countdown}</span>
                </div>
                <div className="quick-actions-alerts">Arrival Alerts</div>
              </div>

              <div className="bus-card-expanded-quick-actions-right">
                

                <div className="quick-actions-location" onClick={handleViewLocation}>
                  <div className="location-btn-arrow"></div>
                  <div>
                    {pred.vehicle_id && (
                      <div
                        className="bus-card-view-location-btn"
                        aria-label={`View bus ${pred.vehicle_id} location on map`}
                      >
                        View Location
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bus-card-expanded-quick-info">
              <div className="bus-card-expanded-quick-info-left">
                Route Timeline
              
              </div>

              <div className="bus-card-expanded-quick-info-right">
                *Timeline will re-scale as bus nears stop
              </div>
            </div>

            <div className="bus-timeline">
              <div className="bus-timeline-top">
                <div className="bus-timeline-top-left">
                  <div className="arrow-icon"></div>
                  <div className="live-action">{pred.live_action}</div>
                  <div className="live-action-summary">{pred.live_action_summary}</div>
                </div>
                <div className="bus-timeline-top-right">{pred.stops_away} stops away</div>
              </div>

              <div className="bus-timeline-bottom">
                <div className="bus-timeline-bottom-content">
                  <div className="bus-timeline-track">
                    <div className="bus-timeline-marker bus-timeline-marker-start">
                      <div className="bus-timeline-marker-dot" />
                    </div>

                    <div className="bus-timeline-progress-container">
                      <div className="bus-timeline-progress-bar">
                        <div
                          className="bus-timeline-progress-fill"
                          style={{
                            width: `${timelinePercent}%`,
                            backgroundColor: getRouteColor(pred.route),
                          }}
                        />
                      </div>

                      <div
                        className="bus-timeline-bus-icon"
                        style={{
                          left: `${timelinePercent}%`,
                          height: "20px",
                          width: "20px",
                          backgroundColor: getRouteColor(pred.route),
                        }}
                        aria-label={`Bus is ${timelinePercent.toFixed(0)}% of the way to your stop`}
                      ></div>

                      {intermediateStops.map((stop, index) => {
                        const showLabel = index % 2 === 0;
                        return (
                          <div
                            key={stop.stop_id}
                            className="bus-timeline-intermediate-marker"
                            style={{ left: `${clampPercent(stop.aaT)}%` }}
                          >
                            <div className="bus-timeline-intermediate-dot" />
                            {showLabel && (
                              <span className="bus-timeline-intermediate-label">
                                {truncateStopName(stop.stop_name_short || stop.stop_name, 8)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="bus-timeline-marker bus-timeline-marker-end">
                      <div className="bus-timeline-marker-dot-end" />
                    </div>
                  </div>

                  <div className="bus-timeline-stats">
                    <span className="bus-timeline-stat">Progress: {timelinePercent.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bus-view">
              <div className="bus-view-top">
                <span>Bus #{pred.vehicle_id}</span>
                <span>{pred.bus_type}</span>
              </div>
              <div className="bus-view-bottom">
                <div className={`bus-view-image-${pred.bus_image}`}></div>
                <div className="bus-view-bottom-text">
                  <span>62 buses in fleet</span>
                  <span>Est. number of passengers onboard: {pred.passenger_count}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function PopularTimesChart({ busynessData, dayOffset = 0 }) {
  const [currentDayOffset, setCurrentDayOffset] = useState(dayOffset);

  if (!busynessData?.today?.overall_by_hour || !busynessData?.today?.by_route_by_hour) {
    return null;
  }

  const hours = busynessData.today.overall_by_hour;
  const maxValue = Math.max(...hours, 1);
  const currentHour = busynessData.current?.hour || new Date().getHours();
  const routeData = busynessData.today.by_route_by_hour;

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date();
  const displayDate = new Date(today);
  displayDate.setDate(today.getDate() + currentDayOffset);
  const dayName = days[displayDate.getDay()];

  const handlePrevDay = () => setCurrentDayOffset((prev) => Math.max(prev - 1, -7));
  const handleNextDay = () => setCurrentDayOffset((prev) => Math.min(prev + 1, 7));

  const getRouteSegments = (hourIndex) => {
    const segments = [];
    const routes = Object.keys(routeData);

    const total = routes.reduce((sum, route) => sum + (routeData[route][hourIndex] || 0), 0);
    if (total === 0) return [];

    routes.forEach((route) => {
      const value = routeData[route][hourIndex] || 0;
      if (value > 0) {
        const percent = (value / total) * 100;
        segments.push({
          route,
          percent,
          color: getRouteColor(route),
        });
      }
    });

    return segments;
  };

  return (
    <div className="popular-times-section">
      <div className="popular-times-header">
        <h2 className="popular-times-title">Popular Times Today</h2>
        <button className="popular-times-info" aria-label="Information about popular times">
          ℹ
        </button>
      </div>

      <div className="popular-times-chart">
        <button className="popular-times-arrow popular-times-arrow-left" onClick={handlePrevDay} aria-label="Previous day">
          ‹
        </button>

        <div className="popular-times-bars">
          {hours.map((value, index) => {
            const heightPercent = (value / maxValue) * 100;
            const isCurrentHour = currentDayOffset === 0 && index === currentHour;
            const segments = getRouteSegments(index);

            return (
              <div
                key={index}
                className={`popular-times-bar-slot ${isCurrentHour ? "popular-times-bar-current" : ""}`}
                aria-label={`${index}:00 - ${value}% busy`}
              >
                <div className="popular-times-pill" aria-hidden="true">
                  <div className="popular-times-fill" style={{ height: `${heightPercent}%` }}>
                    {segments.map((segment, segIndex) => (
                      <div
                        key={segIndex}
                        className="popular-times-segment"
                        style={{
                          height: `${segment.percent}%`,
                          backgroundColor: segment.color,
                        }}
                        title={`Route ${segment.route}: ${segment.percent.toFixed(0)}%`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="popular-times-arrow popular-times-arrow-right" onClick={handleNextDay} aria-label="Next day">
          ›
        </button>
      </div>
    </div>
  );
}

export default function StopPage() {
  const { stopId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const additionalStopsParam = searchParams.get("stops");
  const additionalStops = additionalStopsParam ? additionalStopsParam.split(",").filter(Boolean) : [];

  const allStopIds = [stopId, ...additionalStops].filter(Boolean);
  const isMultiStop = allStopIds.length > 1;

  const [stopsData, setStopsData] = useState({});
  const [busynessData, setBusynessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const REFRESH_SECONDS = 15;
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);

  // Page-level countdown (always running while page mounted)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_SECONDS : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (allStopIds.length === 0) return;

    let cancelled = false;
    let intervalId = null;

    const fetchAllStops = async () => {
      setError(null);

      try {
        const results = await Promise.all(
          allStopIds.map(async (id) => {
            const res = await fetch(`https://badger-transit-dawn-darkness-55.fly.dev/api/predictions/${id}`);
            if (!res.ok) throw new Error(`Failed to load stop ${id}`);
            const json = await res.json();
            return {
              stopId: id,
              results: json.results || [],
              busyness: json.busyness || null,
            };
          })
        );

        if (cancelled) return;

        const dataMap = {};
        results.forEach(({ stopId: id, results: preds }) => {
          dataMap[id] = preds.sort((a, b) => (a.eta_minutes ?? 9999) - (b.eta_minutes ?? 9999));
        });

        setStopsData(dataMap);
        setBusynessData(results[0]?.busyness ?? null);

        // ✅ reset countdown when fresh data is applied
        setCountdown(REFRESH_SECONDS);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err?.message || "Error loading predictions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // New stop set session
    setLoading(true);
    fetchAllStops();
    intervalId = setInterval(fetchAllStops, REFRESH_SECONDS * 1000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [allStopIds.join(",")]);

  const getStopName = (id) => {
    if (id === "10070") return "W Johnson at East Campus";
    if (id === "0626") return "University at N Basset";
    if (id === "6350") return "West Towne Ring at West Towne Mall";
    return `Stop ${id}`;
  };

  // Persist recent stop with visit_count
  useEffect(() => {
    if (!stopId) return;

    try {
      const STORAGE_KEY = "bt_recent_stops";
      const raw = localStorage.getItem(STORAGE_KEY);
      let recent = [];

      if (raw) {
        try {
          recent = JSON.parse(raw);
          if (!Array.isArray(recent)) recent = [];
        } catch {
          recent = [];
        }
      }

      // Find existing entry to increment visit count
      const existing = recent.find((item) => item.stopId === stopId);
      const visitCount = existing ? (existing.visit_count || 0) + 1 : 1;

      const updated = recent.filter((item) => item.stopId !== stopId);

      updated.unshift({
        stopId,
        name: getStopName(stopId),
        lastVisited: new Date().toISOString(),
        visit_count: visitCount,
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 10)));
    } catch (e) {
      console.error("Failed to persist recent stop", e);
    }
  }, [stopId]);

  const handleAddStop = () => {
    const currentStops = allStopIds.join(",");
    navigate(`/map?selectMode=true&returnTo=/stop/${stopId}&existingStops=${currentStops}`);
  };

  const handleGetDirections = () => {
    window.open("https://maps.google.com", "_blank");
  };

  const handleShowOnMap = () => {
    navigate(`/map?stop=${stopId}`);
  };

  const routes = busynessData?.current?.by_route ? Object.keys(busynessData.current.by_route).sort() : [];

  // Combine and sort predictions across all stops
  const allPredictions = [];
  Object.keys(stopsData).forEach((id) => {
    const preds = stopsData[id] || [];
    preds.forEach((pred) => {
      allPredictions.push({
        ...pred,
        sourceStopId: id,
        sourceStopName: getStopName(id),
      });
    });
  });
  allPredictions.sort((a, b) => (a.eta_minutes ?? 9999) - (b.eta_minutes ?? 9999));

  return (
    <main className="stop-root">
      <div className="stop-inner">
        {/* Header */}
        <header className="new-stop-header">
          <div className="new-stop-header-top">
            <div className="search-box">
              <div className="new-stop-logo">
                <div className="new-stop-logo-circle" aria-hidden="true" />
              </div>

              <button className="new-stop-search" onClick={() => navigate("/chat")} aria-label="Search with BusterChat">
                <span className="new-stop-search-text">"Whats the fastest route to..."</span>
              </button>
            </div>

            <div className="header-top-left">
              <button className="new-stop-notif-btn" aria-label="Notifications">
                <span className="new-stop-notif-badge">2</span>
              </button>
              <button className="new-stop-menu-btn" aria-label="Menu"></button>
            </div>
          </div>

          <nav className="new-stop-nav" aria-label="Primary navigation">
            <button className="new-stop-nav-btn" onClick={() => navigate("/")}>
              Home
            </button>
            <div className="divider"></div>
            <button className="new-stop-nav-btn" onClick={() => navigate("/recent")}>
              Recent
            </button>
            <div className="divider"></div>
            <button className="new-stop-nav-btn" onClick={() => navigate("/map")}>
              Map
            </button>
            <div className="divider"></div>
            <button className="new-stop-nav-btn" onClick={() => navigate("/help")}>
              Help
            </button>
          </nav>
        </header>

        <div className="header-under-fixed"></div>
        <div className="header-under"></div>

        {/* Stop Info */}
        <section className="new-stop-info">
          <div className="new-stop-info-row">
            <h1 className="new-stop-id">#{stopId}</h1>
            <div className="new-stop-routes">
              {routes.map((route) => (
                <span key={route} className="new-stop-route-badge" style={{ backgroundColor: getRouteColor(route) }}>
                  {route}
                </span>
              ))}
            </div>
          </div>
          <div className="new-stop-name">{getStopName(stopId)}</div>
        </section>

        {/* Popular Times */}
        {busynessData && <PopularTimesChart busynessData={busynessData} />}

        {/* Actions */}
        <section className="new-stop-actions">
          <div className="action-left">
            <button className="new-stop-action-btn" onClick={handleGetDirections}>
              <span className="get-directions-icon"></span>
              Get Directions
            </button>
          </div>
          <div className="action-right">
            <button className="new-stop-action-btn" onClick={handleAddStop}>
              <span className="add-stop-icon"></span>
              Add Stop
            </button>
            <button className="new-stop-action-btn-circle" onClick={handleShowOnMap}>
              <span className="view-on-map-icon"></span>
            </button>
            <button className="new-stop-action-btn-circle" aria-label="Favorite this stop">
              <span className="favorite-stop-icon"></span>
            </button>
          </div>
        </section>

        {/* Labels */}
        <div className="stop-label-row" role="presentation">
          <div className="label-row-left">
            <span>Route</span>
            <span>Destination</span>
          </div>
          <div className="label-row-right">
            <span>ETA</span>
            <span>Expand</span>
          </div>
        </div>

        {/* Cards */}
        <section className="stop-cards" aria-labelledby="upcoming-buses-title">
          <h2 id="upcoming-buses-title" className="visually-hidden">
            Upcoming Buses
          </h2>

          {loading && (
            <div className="stop-loading" role="status" aria-live="polite">
              Loading buses…
            </div>
          )}

          {error && (
            <div className="stop-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {!loading && !error && allPredictions.length === 0 && (
            <div className="stop-empty" role="status">
              No upcoming buses at {isMultiStop ? "these stops" : "this stop"}.
            </div>
          )}

          {!loading &&
            !error &&
            allPredictions.map((pred) => {
              const key = `${pred.sourceStopId}-${pred.trip_uid || pred.route}-${pred.predicted_time}`;
              const stopLabel = isMultiStop ? pred.sourceStopName : null;

              return (
                <RegularBusCard
                  key={key}
                  pred={pred}
                  stopName={stopLabel}
                  stopId={pred.sourceStopId}
                  countdown={countdown}
                  refreshSeconds={REFRESH_SECONDS}
                />
              );
            })}
        </section>

        <div className="stop-end-label" role="separator">
          End of Bus Information
        </div>

        <section className="stop-report-card">
          <div className="stop-report-icon" aria-hidden="true" />
          <span>Report an issue at {isMultiStop ? "these stops" : "this bus stop"}</span>
        </section>

        <footer className="home-footer routes-footer">
          <div className="home-footer-left">
            <div className="home-logo-small-square" aria-hidden="true" />
            <span className="home-footer-brand">badger transit</span>
          </div>
          <div className="home-footer-links">
            <a href="mailto:support@badgertransit.com?subject=Bug Report" className="home-footer-link">
              report a bug
            </a>
            <a href="/terms" className="home-footer-link">
              terms of service
            </a>
          </div>
          <div className="home-footer-meta">badgertransit ©2026</div>
        </footer>
      </div>
    </main>
  );
}