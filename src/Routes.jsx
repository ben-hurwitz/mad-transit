// src/Routes.jsx
import "./Routes.css";
import "./Home.css";
import { Link, useNavigate, NavLink} from "react-router-dom";

const ROUTE_GROUPS = [
  {
    title: "Bus Rapid Transit",
    routes: [
      { code: "A", color: "#DA322C", name: "Route A" },
      { code: "B*", color: "#8FBA40", name: "Route B (limited service)" },
      { code: "F*", color: "#2967A0", name: "Route F (limited service)" },
    ],
  },
  {
    title: "Campus Buses",
    routes: [
      { code: "80", color: "#2D2D51", name: "Route 80" },
      { code: "82", color: "#2D2D51", name: "Route 82" },
      { code: "81", color: "#2D2D51", name: "Route 81" },
      { code: "84", color: "#2D2D51", name: "Route 84" },
    ],
  },
  {
    title: "Standard Service",
    routes: [
      { code: "C", color: "#2D2D51", name: "Route C" },
      { code: "D", color: "#2D2D51", name: "Route D" },
      { code: "E", color: "#2967A0", name: "Route E" },
      { code: "G", color: "#2967A0", name: "Route G" },
      { code: "H", color: "#2967A0", name: "Route H" },
      { code: "J", color: "#2967A0", name: "Route J" },
      { code: "L", color: "#4BA0BF", name: "Route L" },
      { code: "O", color: "#4BA0BF", name: "Route O" },
      { code: "P", color: "#4BA0BF", name: "Route P" },
      { code: "R", color: "#4BA0BF", name: "Route R" },
      { code: "S", color: "#4BA0BF", name: "Route S" },
      { code: "W", color: "#2967A0", name: "Route W" },
      { code: "28", color: "#2967A0", name: "Route 28" },
      { code: "38", color: "#2967A0", name: "Route 38" },
      { code: "55", color: "#4BA0BF", name: "Route 55" },
      { code: "60", color: "#4BA0BF", name: "Route 60" },
      { code: "61", color: "#4BA0BF", name: "Route 61" },
      { code: "62", color: "#4BA0BF", name: "Route 62" },
      { code: "63", color: "#4BA0BF", name: "Route 63" },
      { code: "64", color: "#4BA0BF", name: "Route 64" },
      { code: "65", color: "#4BA0BF", name: "Route 65" },
      { code: "75", color: "#4BA0BF", name: "Route 75" },
    ],
  },
];

export default function RoutesPage() {
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
    <main className="routes-root">
      <div className="routes-inner">
        {/* Top bar: logo + time/date + nav */}
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

        {/* Title + subtitle */}
        <section className="routes-hero" aria-labelledby="routes-title">
          <h1 id="routes-title" className="routes-hero-title">→ Routes</h1>
          <p className="routes-hero-subtitle">
            Select a route to see live bus locations
          </p>
        </section>

        {/* Route groups */}
        <div className="routes-groups">
          {ROUTE_GROUPS.map((group) => (
            <section 
              key={group.title} 
              className="routes-panel"
              aria-labelledby={`group-${group.title.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <h2 
                id={`group-${group.title.replace(/\s+/g, '-').toLowerCase()}`}
                className="routes-panel-title"
              >
                {group.title}
              </h2>
              <nav 
                className="routes-chip-row"
                aria-label={`${group.title} routes`}
              >
                {group.routes.map((route) => (
                  <Link
                    key={route.code}
                    to={`/map/${route.code}`}
                    className="route-chip-link"
                    style={{ backgroundColor: route.color }}
                    aria-label={`View ${route.name} on map`}
                  >
                    <span aria-hidden="true">{route.code}</span>
                  </Link>
                ))}
              </nav>
            </section>
          ))}
        </div>

        {/* Footer reused from home */}
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