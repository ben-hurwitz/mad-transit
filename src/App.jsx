// src/App.jsx
import { useEffect, useState, useRef } from "react";
import { Routes, Route, Link, NavLink, useNavigate } from "react-router-dom";
import "./Home.css";
import "./HomeHeader.css";
import "./HomePage.css";
import RoutesPage from "./Routes.jsx";
import MapPage from "./MapPage.jsx";
import StopPage from "./StopPage.jsx";
import RecentPage from "./Recent.jsx";
import SmartLaunchPage from "./SmartLaunch.jsx";
import { loadSmartLaunchRules } from "./utils/smartLaunch";
import SavedPage from "./Saved.jsx";
import BusterTest from "./BusterTest.jsx";
import BusterChat from "./BusterChat.jsx";
// Import CSV directly from src folder
import stopsCSVUrl from './stops.csv?raw';

// simple haversine distance in meters
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const API_BASE_URL = "https://badger-transit-dawn-darkness-55.fly.dev";

// Convert meters to feet
function metersToFeet(meters) {
  return meters * 3.28084;
}

function isRuleActiveNow(rule, now = new Date()) {
  if (!rule.startTime || !rule.endTime) {
    // no time window -> always active
    return true;
  }

  const [sh, sm] = rule.startTime.split(":").map(Number);
  const [eh, em] = rule.endTime.split(":").map(Number);
  if (
    !Number.isFinite(sh) ||
    !Number.isFinite(sm) ||
    !Number.isFinite(eh) ||
    !Number.isFinite(em)
  ) {
    return true; // fallback if stored weird
  }

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (startMin <= endMin) {
    // simple window, e.g. 07:00–12:00
    return nowMin >= startMin && nowMin <= endMin;
  } else {
    // wraps midnight, e.g. 22:00–02:00
    return nowMin >= startMin || nowMin <= endMin;
  }
}

// Parse the imported CSV data
function parseStopsCSV(csvText) {
  try {
    console.log('Parsing CSV text, first 200 chars:', csvText.substring(0, 200));
    
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log(`Total lines in CSV: ${lines.length}`);
    
    if (lines.length === 0) {
      console.error('CSV file is empty');
      return [];
    }
    
    // Skip header (first line)
    const dataLines = lines.slice(1);
    console.log(`Processing ${dataLines.length} data lines...`);
    
    const stops = dataLines.map((line, index) => {
      // Handle both comma and quoted comma separators
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts.length < 4) {
        console.warn(`Line ${index + 2} has fewer than 4 columns:`, line);
        return null;
      }
      
      const [stop_id, stop_name, lat, lon] = parts;
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      
      if (!stop_id || isNaN(latNum) || isNaN(lonNum)) {
        console.warn(`Line ${index + 2} has invalid data:`, { stop_id, lat: latNum, lon: lonNum });
        return null;
      }
      
      return {
        stop_id: stop_id,
        stop_name: stop_name || `Stop ${stop_id}`,
        lat: latNum,
        lon: lonNum
      };
    }).filter(stop => stop !== null);
    
    console.log(`Successfully parsed ${stops.length} valid stops`);
    if (stops.length > 0) {
      console.log('First stop:', stops[0]);
    }
    
    return stops;
  } catch (error) {
    console.error('Failed to parse CSV:', error);
    console.error('Error details:', error.message);
    return [];
  }
}

// Load stops from imported CSV
async function loadStopsCSV() {
  console.log('Loading stops from imported CSV...');
  return parseStopsCSV(stopsCSVUrl);
}

// Get visit count for a stop from localStorage
function getVisitCount(stopId) {
  try {
    const raw = localStorage.getItem('bt_recent_stops');
    if (!raw) return 0;
    
    const recent = JSON.parse(raw);
    if (!Array.isArray(recent)) return 0;
    
    const stop = recent.find(item => item.stopId === stopId);
    return stop?.visit_count || 0;
  } catch {
    return 0;
  }
}

// Calculate suggested stops based on location and visit history
function calculateSuggestedStops(userLat, userLon, allStops) {
  const MAX_DISTANCE_FEET = 2000;
  const CLOSE_THRESHOLD_FEET = 500;
  
  // Calculate distance for each stop and filter by max distance
  const stopsWithDistance = allStops.map(stop => {
    const distanceM = distanceMeters(userLat, userLon, stop.lat, stop.lon);
    const distanceFt = metersToFeet(distanceM);
    const visitCount = getVisitCount(stop.stop_id);
    
    return {
      ...stop,
      distanceMeters: distanceM,
      distanceFeet: distanceFt,
      visit_count: visitCount
    };
  }).filter(stop => stop.distanceFeet <= MAX_DISTANCE_FEET);
  
  // Sort by distance first
  stopsWithDistance.sort((a, b) => a.distanceFeet - b.distanceFeet);
  
  // Apply secondary sort by visit_count for stops within close threshold
  const sorted = [];
  let i = 0;
  
  while (i < stopsWithDistance.length && sorted.length < 3) {
    // Find all stops within CLOSE_THRESHOLD_FEET of current stop
    const closeGroup = [stopsWithDistance[i]];
    const currentDistance = stopsWithDistance[i].distanceFeet;
    
    for (let j = i + 1; j < stopsWithDistance.length; j++) {
      if (stopsWithDistance[j].distanceFeet - currentDistance <= CLOSE_THRESHOLD_FEET) {
        closeGroup.push(stopsWithDistance[j]);
      } else {
        break;
      }
    }
    
    // Sort this close group by visit_count (descending)
    closeGroup.sort((a, b) => b.visit_count - a.visit_count);
    
    // Add to results
    sorted.push(...closeGroup);
    i += closeGroup.length;
  }
  
  return sorted.slice(0, 3);
}

// Extract the directional portion of a stop description
function extractDirectionalDescription(description) {
  if (!description) return '';

  const boundIndex = description.toLowerCase().indexOf('bound');
  let result;

  if (boundIndex === -1) {
    result = description;
  } else {
    let startIndex = boundIndex;
    while (startIndex > 0 && description[startIndex - 1] !== ' ') {
      startIndex--;
    }
    result = description.substring(startIndex);
  }

  // Normalize
  result = result.trim();
  if (result.length === 0) return '';

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);

  if(result.charAt(0) == "E" || result.charAt(0) == "W"){
    if(result.charAt(0) == "E"){
      result = result.substring(0,9);
    }
    else{
      result = result.substring(0,9);
    }
  }

  if(result.charAt(0) == "N" || result.charAt(0) == "S"){
    result = result.substring(0,10);
  }
  

  // Truncate to 50 characters
  const MAX_LEN = 1000;
  if (result.length > MAX_LEN) {
    result = result.slice(0, MAX_LEN).trimEnd() + '…';
  }

  return result;
}

// Fetch complete stop details from YOUR backend (proxying wisc.edu)
async function fetchStopDetails(stopId) {
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/bus-stops/${stopId}`);
    if (!res.ok) {
      console.error(`Failed to fetch stop details for ${stopId}: ${res.status}`);
      return null;
    }

    const json = await res.json();

    const res1 = await fetch(`https://badger-transit-dawn-darkness-55.fly.dev/api/predictions/${stopId}`);
    if (!res.ok) return [];
    const json1 = await res1.json();
    const routes = json1.busyness?.current?.by_route 
      ? Object.keys(json1.busyness.current.by_route).sort() 
      : [];

    return {
      routes,
      description: extractDirectionalDescription(json.stop_desc || ""),
    };
  } catch (error) {
    console.error(`Failed to fetch stop details for ${stopId}:`, error);
    return null;
  }
}

function isBRTstop(stopId){
  if (stopId > 9999)
    return true;
  return false;
}

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

function getRouteColor(code) {
  return ROUTE_COLORS[code] || "#000000";
}

// === HOME PAGE ===
function HomePage() {
  const navigate = useNavigate();
  const [redirectInfo, setRedirectInfo] = useState(null);
  const [suggestedStops, setSuggestedStops] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const timeoutRef = useRef(null);
  const cancelledRef = useRef(false);

  // Load suggested stops
  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      console.log('🔍 Starting to load suggested stops...');
      
      if (!('geolocation' in navigator)) {
        console.log('❌ Geolocation not available');
        setLoadingSuggestions(false);
        return;
      }

      try {
        console.log('📍 Requesting geolocation...');
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            maximumAge: 60000,
            timeout: 10000,
          });
        });

        if (cancelled) return;

        const { latitude, longitude } = position.coords;
        console.log(`✅ Got location: ${latitude}, ${longitude}`);
        
        console.log('📄 Loading stops CSV...');
        const allStops = await loadStopsCSV();
        console.log(`✅ Loaded ${allStops.length} stops from CSV`);
        
        if (cancelled) return;

        const suggested = calculateSuggestedStops(latitude, longitude, allStops);
        console.log(`🎯 Found ${suggested.length} suggested stops:`, suggested);
        
        // Fetch stop details (routes and description) for each suggested stop
        console.log('🚌 Fetching stop details for suggested stops...');
        const stopsWithDetails = await Promise.all(
          suggested.map(async (stop) => {
            const details = await fetchStopDetails(stop.stop_id);
            console.log(`  Stop ${stop.stop_id}: ${details?.routes?.length || 0} routes`);
            return { 
              ...stop, 
              routes: details?.routes || [],
              description: details?.description || ''
            };
          })
        );

        if (!cancelled) {
          console.log('✅ Setting suggested stops:', stopsWithDetails);
          setSuggestedStops(stopsWithDetails);
          setLoadingSuggestions(false);
        }
      } catch (error) {
        console.error('❌ Failed to load suggested stops:', error);
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    }

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, []);

  // SmartLaunch auto-jump on home load
  useEffect(() => {
    const rules = loadSmartLaunchRules().filter((r) => r.enabled !== false);
    if (rules.length === 0) return;

    if (!("geolocation" in navigator)) return;

    // fresh mount: assume not cancelled
    cancelledRef.current = false;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const now = new Date();

        const match = rules.find((rule) => {
          if (!isRuleActiveNow(rule, now)) {
            return false;
          }
          const d = distanceMeters(
            latitude,
            longitude,
            rule.center.lat,
            rule.center.lon
          );
          return d <= rule.radiusMeters;
        });

        if (match && !cancelledRef.current) {
          // show toast
          setRedirectInfo({
            stopId: match.stopId,
            name: match.name || `Stop ${match.stopId}`,
          });

          // then navigate after a short delay
          timeoutRef.current = window.setTimeout(() => {
            // extra safety guard in case user clicked Stop or component unmounted
            if (!cancelledRef.current) {
              navigate(`/stop/${match.stopId}`);
            }
            timeoutRef.current = null;
          }, 1100); // Match the CSS animation duration
        }
      },
      (err) => {
        console.warn("SmartLaunch geolocation failed/denied", err);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 10000,
      }
    );

    return () => {
      // mark as cancelled so any late timer won't navigate
      cancelledRef.current = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [navigate]);

  const handleCancelRedirect = () => {
    // mark as cancelled so even if timeout fires, it won't navigate
    cancelledRef.current = true;

    // Clear the timeout to prevent navigation
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Hide the toast
    setRedirectInfo(null);
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

  const timeNew = now.toLocaleTimeString([], {
    hour: "numeric",
  });

  const d = new Date();
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23' // Forces 24-hour format (00-23)
};

  const localTime24hr = d.toLocaleTimeString(navigator.language, options);
  const hourOfDay = Number(d.toLocaleTimeString(navigator.language, options).substring(0,2));
  let message = "Hey there";
  let dayPeriod = "day";

  if(hourOfDay <= 5){
    message = "Its late! Limited buses running!"
    dayPeriod = "evening";
  }
  if(hourOfDay > 5 && hourOfDay <= 11){
    message = "Good Morning";
    dayPeriod = "morning";
  }

  if(hourOfDay > 11 && hourOfDay <= 17){
    message = "Good Afternoon";
    dayPeriod = "afternoon";
  }

  if(hourOfDay > 17 && hourOfDay <= 24){
    message = "Good Evening";
    dayPeriod = "evening";
  }


  return (
    <main className="home-root">
      <div className={`home-page-home-phone-${dayPeriod}`}>
        {redirectInfo && (
          <div 
            className="smartlaunch-toast" 
            role="alert" 
            aria-live="assertive"
          >
            <div className="smartlaunch-toast-inner">
              <div className="smartlaunch-toast-icon-circle" aria-hidden="true">
                <svg className="smartlaunch-progress-svg" viewBox="0 0 88 88">
                  <circle className="bg"></circle>
                  <circle className="fg"></circle>
                </svg>
                <span className="smartlaunch-toast-icon-arrow">➜</span>
              </div>
              <div className="smartlaunch-toast-stop-id">
                #{redirectInfo.stopId}
              </div>
              <button
                type="button"
                className="smartlaunch-toast-button"
                onClick={handleCancelRedirect}
                aria-label={`Cancel redirect to stop ${redirectInfo.stopId}`}
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        {/* New Header */}
        <header className="home-header">
          <div className="home-header-top">
            <div className="home-search-box">
              <div className="new-stop-logo">
                <div className="new-stop-logo-circle" aria-hidden="true" />
              </div>

              <button className="new-stop-search" onClick={() => navigate("/chat")} aria-label="Search with BusterChat">
                <span className="home-search-text">"Whats the fastest route to..."</span>
              </button>
            </div>
            <div className="home-header-top-left">
              <button className="home-notif-btn" aria-label="Notifications">
                <span className="new-stop-notif-badge">2</span>
              </button>

              <button className="home-menu-btn" aria-label="Menu">
              </button>
            </div>
          </div>

          <nav className="home-nav" aria-label="Primary navigation">
            <button className="home-nav-btn" onClick={() => navigate("/")}>
              Home
            </button>
            <div className="divider"></div>
            <button className="home-nav-btn" onClick={() => navigate("/recent")}>
              Recent
            </button>
            <div className="divider"></div>
            <button className="home-nav-btn" onClick={() => navigate("/map")}>
              Map
            </button>
            <div className="divider"></div>
            <button className="home-nav-btn" onClick={() => navigate("/help")}>
              Help
            </button>
          </nav>
        </header>

        
        <div className="home-header-under-fixed"></div>
        <div className="home-header-under"></div>
        <div className="page-vignette"></div>
        
        {/* Title */}
        <section className="home-hero" aria-labelledby="hero-title">
          <h1 id="hero-title" className="home-hero-title">
            {message}
          </h1>
        </section>

        {/* Suggested Stops Section */}
        {loadingSuggestions && (
          <section className="suggestion-box" aria-labelledby="loading-title">
            <h2 id="loading-title" className="suggestion-title">
              Loading suggested stops...
            </h2>
          </section>
        )}

        {!loadingSuggestions && suggestedStops.length === 0 && (
          <section className="suggestion-box" aria-labelledby="no-suggestions-title">
            <h2 id="no-suggestions-title" className="suggestion-title">
              No nearby stops found (check console for details)
            </h2>
          </section>
        )}

        {!loadingSuggestions && suggestedStops.length > 0 && (
          <>
            <section className="suggestion-box" aria-labelledby="suggested-title">
              <h2 id="suggested-title" className="suggestion-title">
                Suggested Stops
              </h2>
            </section>

            <section className="suggested-card-grid" aria-label="Suggested stops near you">
              {suggestedStops.map((stop) => (
                <Link 
                  key={stop.stop_id} 
                  to={`/stop/${stop.stop_id}`} 
                  className="suggested-stop-card"
                >
                  {stop.stop_id > 9999 && (
                    <div className="suggested-stop-card-icon-brt"></div>
                  )
                  }
                  {stop.stop_id < 9999 && (
                    <div className="suggested-stop-card-icon-reg"></div>
                  )
                  }
                  <div className="suggested-stop-card-right">
                    <div className="suggested-stop-card-right-left">
                      <div className="suggested-stop-card-right-left-top">
                        <div className="suggested-stop-card-info">
                          <div className="suggested-stop-card-info-top">
                          <div className="suggested-stop-card-info-stop-name"><span className="suggest-stop-id">{stop.stop_id}</span>{stop.description} </div>
                            <div className="suggested-stop-card-info-route-chips">
                            {stop.routes && stop.routes.length > 0 && (
                              <div className="suggested-stop-routes">
                                {stop.routes.slice(0, 9).map((route) => (
                                  <span 
                                    key={route} 
                                    className="suggested-route-badge"
                                    style={{ backgroundColor: getRouteColor(route) }}
                                  >
                                    {route}
                                  </span>
                                ))}
                                {stop.routes.length > 9 && (
                                  <span className="suggested-route-more">
                                    +{stop.routes.length - 9}
                                  </span>
                                )}
                              </div>
                            )}
                            </div>
                          </div>
                          
                          
                        </div>
                      </div>
                      <div className="suggested-stop-card-right-left-bottom">
                        <div className="suggested-stop-card-divider"></div>
                        {stop.description && (
                          <div className="suggested-stop-card-info-description">
                            {stop.stop_name}
                          </div>
                        )}
                      </div>
                      
                      
                      
                      
                    </div>
                    <div className="suggested-stop-card-right-right">
                      <div className="suggested-stop-card-feet">{Math.round(stop.distanceFeet)} ft</div>
                      <span className="visit-count">{getVisitCount(stop.stop_id)} visits</span>
                    </div>
                  </div>
                  
                </Link>
              ))}
            </section>
          </>
        )}

        {/* Navigation */}
        <section className="navigation-box" aria-labelledby="suggested-title">
              <h2 id="suggested-title" className="suggestion-title">
                Traveling Somewhere New?
              </h2>
        </section>
        <div className="destination-bar">
          <span className = "dest-content" >Where to?</span>
        </div>
        
        {/* Quick Action */}
        <section className="options-box" aria-labelledby="suggested-title">
              <h2 id="suggested-title" className="suggestion-title">
                Other Tracking Options
              </h2>
        </section>
        <div className="options-grid">
          <div className="options-grid-top">
            <Link to="/map" className="options-btn">
              <div className="home-card-icon home-card-icon-map" aria-hidden="true" />
              <p className="home-card-title">Select a stop from Map</p>
            </Link>
            <Link to="/saved" className="options-btn">
            <div className="home-card-icon home-card-icon-saved" aria-hidden="true" />
            <p className="home-card-title">View saved stops and groups</p>
            </Link>
          </div>
          <div className="options-grid-bottom">
            <Link to="/recent" className="options-btn">
              <div className="home-card-icon home-card-icon-star" aria-hidden="true" />
              <p className="home-card-title">View recently visited stops</p>
            </Link>
            <Link to="/routes" className="options-btn">
            <div className="home-card-icon home-card-icon-search" aria-hidden="true" />
            <p className="home-card-title">Search by Stop ID</p>
            </Link>
          </div>
          
        </div>
          {/*
          <Link to="/buster" className="home-card">
            <div className="home-card-icon home-card-icon-search" aria-hidden="true" />
            <p className="home-card-title">Try Buster (experimental)</p>
          </Link>
          */}
          

          

          

          {/*

          <Link to="/routes" className="home-card">
            <div className="home-card-icon home-card-icon-routes" aria-hidden="true" />
            <p className="home-card-title">See live bus locations by route</p>
          </Link>
          */}


          {/*For now, hide
        {/* Footer *}
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
          <div className="home-footer-meta">
            badgertransit ©2026 built for CS571
          </div>
        </footer>
        */}
      </div>
    </main>
  );
}

// === ROUTER ===
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Map modes */}
      <Route path="/map" element={<MapPage />} />
      <Route path="/map/:routeId" element={<MapPage />} />
      {/* track a single bus from a stop */}
      <Route path="/map/:stopId/:vehicleId" element={<MapPage />} />
      {/* track a single bus with all other buses visible */}
      <Route path="/map/:stopId/:vehicleId/:all" element={<MapPage />} />

      <Route path="/routes" element={<RoutesPage />} />
      <Route path="/stop/:stopId" element={<StopPage />} />
      <Route path="/recent" element={<RecentPage />} />
      <Route path="/saved" element={<SavedPage />} />
      {/* Settings -> SmartLaunch */}
      <Route path="/settings" element={<SmartLaunchPage />} />
      <Route path="*" element={<HomePage />} />
      <Route path="/buster" element={<BusterTest />} />
      <Route path="/buster-chat" element={<BusterChat />} />

    </Routes>
  );
}