// src/components/MapPage.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, NavLink, Link, useSearchParams } from "react-router-dom";

import MapView from "./components/MapView";
import StopMarkers from "./components/StopMarkers";
import BusLayer from "./components/BusLayer";
import RouteLayer from "./components/RouteLayer";
import { loadStops } from "./utils/loadStops";
import { loadSmartLaunchRules, saveSmartLaunchRules } from "./utils/smartLaunch";
import "./MapHeader.css";
import "./Map.css";
import { MOCK_TRACK_DATA } from "./utils/mockTrackData";
import busReg from "./assets/btv2busicon.svg";
import busLarge from "./assets/mtv3busiconmapred.svg";
import busRed from "./assets/mtv3busiconmapred.svg";

import { Marker, Source, Layer } from "react-map-gl";

/* ====== SHARED HELPERS FOR BUS CARD ====== */

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

const ROUTE_IMAGE = {
  A: "busRed",
  A1: "#FF0000",
  A2: "#FF0000",
  B: "#84BC00",
  F: "#2272B5",
  80: "#FF7300",
  81: "#00B7C8",
  82: "#BC009D",
  84: "#C1C800",
  D: "busRed",
  D1: "busRed",
  D2: "busRed",
};

const ROUTE_COLORSB = {
  A: "#FF5D60",
  A1: "#FF5D60",
  A2: "#FF5D60",
  B: "#AFD766",
  F: "#1785E1",
  80: "#FF8D30",
  81: "#FF8D30",
  82: "#FF8D30",
  84: "#FF8D30",
  D: "#4F558F",
  D1: "#4F558F",
  D2: "#4F558F",
  C: "#4F558F",
  C1: "#4F558F",
  C2: "#4F558F",
  E: "#1785E1",
  G: "#1785E1",
  H: "#1785E1",
  J: "#1785E1",
  W: "#1785E1",
  28: "#1785E1",
  38: "#1785E1",
  L: "#69CFF6",
  O: "#69CFF6",
  P: "#69CFF6",
  R: "#69CFF6",
  R1: "#69CFF6",
  R2: "#69CFF6",
  S: "#69CFF6",
  55: "#69CFF6",
  60: "#69CFF6",
  65: "#69CFF6",

};

function getOccupancyText(occupancy) {
  if (occupancy === "EMPTY") return "Empty";
  if (occupancy === "HALF_EMPTY") return "Half-Full";
  if (occupancy === "FULL") return "Crowded";
  return "";
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


function getRouteColor(code) {
  return ROUTE_COLORS[code] || "#000000";
}

function getRouteImage(code) {
  return ROUTE_IMAGE[code] || "#000000";
}

function getRouteColorB(code) {
  return ROUTE_COLORSB[code] || "#000000";
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

function formatStopsAway(vehicle) {
  if (vehicle.dyn === 4) {
    return "Drop offs only";
  }
  if (vehicle.stops_away != null) {
    const n = vehicle.stops_away;
    return `${n} stop${n === 1 ? "" : "s"} away`;
  }
  if (Array.isArray(vehicle.stops_between) && vehicle.stops_between.length > 0) {
    const n = vehicle.stops_between.length;
    return `${n} stop${n === 1 ? "" : "s"} away`;
  }
  if (vehicle.stops_away === 0) {
    return "Approaching Stop";
  }
  if (vehicle.eta_minutes <= 1) {
    return "At Stop";
  }
  if (vehicle.stops_away === null) {
    return "En Route";
  }
  return "Many Stops Away";
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

function TrackBusCard({ vehicle, navigate }) {
  const arrivalLabel = formatArrivalTime(vehicle.predicted_time);
  const stopsAwayText = formatStopsAway(vehicle);
  const occDots = getOccupancyDots(vehicle.occupancy || "");
  const occLabel = getOccupancyLabel(vehicle.occupancy || "");
  const occText = getOccupancyText(vehicle.occupancy || "");

  return (
    <>
    <div className = "live-action-card">
      <div className="live-action-map">{vehicle.live_action}</div>
      <div className="live-action-summary-map">{vehicle.live_action_summary}</div>
    </div>
    <article 
      className="map-bus-card"
      aria-label={`Route ${vehicle.route} to ${vehicle.destination}, arriving in ${vehicle.eta_minutes} minutes`}
    >
      <div
        className="bus-card-route-map"
        style={{ backgroundColor: getRouteColor(vehicle.route) }}
        aria-label={`Route ${vehicle.route}`}
      >
        {vehicle.route}
      </div>

      <div className="map-bus-card-main">
        <div className="map-bus-card-left">
          {/* top row */}
          <div className="bus-card-top">
            <div className="bus-card-destination-map">{vehicle.destination}</div>
            <div className="map-bus-card-times">
              <div className="map-bus-card-eta" aria-label={`Estimated time: ${vehicle.eta_minutes} minutes`}>
                {vehicle.eta_minutes != null ? `${vehicle.eta_minutes}` : "--"}
              </div>
              <div className="bus-card-eta" aria-label={`Estimated time: ${vehicle.eta_minutes} minutes`}>
                {vehicle.eta_minutes != null ? ` min` : "--"}
              </div>
              <div className="network-icon"></div>
            </div>
          </div>

          {/* second row */}
          <div className="bus-card-bottom">
          <div className="map-bus-card-stops-away">
            {vehicle.away_summary}
        </div>
          <div className="bus-card-occupancy">
          {occText && <span className="bus-card-occ-text-map">{occText}</span>}
          <div className="bus-card-dots" aria-label={occLabel}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={"occ-person" + (i < occDots ? " occ-person-filled-map" : " occ-person-empty")}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
          </div>
        </div>

        <div className="map-bus-card-right">
            <button
              type="button"
              className="map-cancel-back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back to previous page"
            >
            </button>
        </div>
      </div>
    </article>
    </>
  );
}

/* ====== SIMPLE CIRCLE POLYGON FOR SMARTLAUNCH ====== */

function makeCircleFeature(lat, lon, radiusMeters, id, stopId, points = 64) {
  const coords = [];
  const R = 111320;
  const dLat = radiusMeters / R;
  const dLonBase = radiusMeters / (R * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const newLat = lat + dy * dLat;
    const newLon = lon + dx * dLonBase;
    coords.push([newLon, newLat]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {
      id,
      stopId,
    },
  };
}

/* ====== MAIN PAGE ====== */

function MapPage() {
  useEffect(() => {
    document.body.classList.add("map-bg");
    window.scrollTo(0, 0);
    return () => document.body.classList.remove("map-bg");
  }, []);

  // /map/:routeId  OR  /map/:stopId/:vehicleId  OR  /map/:stopId/:vehicleId/all
  const { routeId, stopId, vehicleId, all } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selection mode for adding stops
  const selectMode = searchParams.get('selectMode') === 'true';
  const returnTo = searchParams.get('returnTo');
  const existingStops = searchParams.get('existingStops');

  const isRouteMode = !!routeId && !vehicleId;
  const isTrackMode = !!stopId && !!vehicleId;
  const showAllBuses = all === 'all';

  const [stops, setStops] = useState([]);
  const [showStops, setShowStops] = useState(true);

  // Route mode state
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Track mode state
  const [trackData, setTrackData] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState(null);
  const [countdown, setCountdown] = useState(5);

  // All buses state (for /all mode)
  const [allBusesData, setAllBusesData] = useState(null);
  const [allBusesLoading, setAllBusesLoading] = useState(false);
  const [allBusesError, setAllBusesError] = useState(null);

  // SmartLaunch rules
  const [smartLaunchRules, setSmartLaunchRules] = useState([]);
  const [smartCenter, setSmartCenter] = useState(null);

  // Map Loaded State
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // User location state
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Bus tracking state
  const [isBusTrackingActive, setIsBusTrackingActive] = useState(false);

  // Map ref
  const mapRef = useRef(null);

  const autoCenteringRef = useRef(false);


  // time + date (same as HomePage)
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

  // Load stops once
  useEffect(() => {
    loadStops()
      .then(setStops)
      .catch((err) => {
        console.error("Failed to load stops", err);
        setStops([]);
      });
  }, []);

  // Load SmartLaunch rules once
  useEffect(() => {
    setSmartLaunchRules(loadSmartLaunchRules());
  }, []);

  // ROUTE MODE: fetch route details when routeId is present
  useEffect(() => {
    if (!isRouteMode) {
      setRouteData(null);
      setRouteError(null);
      setRouteLoading(false);
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    fetch(
      `https://badger-transit-dawn-darkness-55.fly.dev/api/routes/${routeId}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load route ${routeId}`);
        }
        return res.json();
      })
      .then((data) => {
        setRouteData(data);
      })
      .catch((err) => {
        console.error(err);
        setRouteError(err.message || "Error loading route");
      })
      .finally(() => {
        setRouteLoading(false);
      });
  }, [isRouteMode, routeId]);

  // TRACK MODE: fetch tracking data for stopId + vehicleId
  useEffect(() => {
    if (!isTrackMode) {
      setTrackData(null);
      setTrackError(null);
      setTrackLoading(false);
      return;
    }

    const fetchTrackingData = () => {
      setTrackLoading(true);
      setTrackError(null);

      // ✅ Toggle mock by adding ?mockTrack=true to the URL
      const useMock = searchParams.get("mockTrack") === "true";

      if (useMock) {
        // Tiny delay so your loading overlay styling is still testable
        setTimeout(() => {
          setTrackData({
            ...MOCK_TRACK_DATA,
            vehicle_id: vehicleId ?? MOCK_TRACK_DATA.vehicle_id,
          });
          setTrackLoading(false);
          setCountdown(5); // Reset countdown after fetch
        }, 250);
        return;
      }

      fetch(`https://badger-transit-dawn-darkness-55.fly.dev/api/track/${vehicleId}/${stopId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load tracking info");
          return res.json();
        })
        .then((data) => {
          if (!data.success) throw new Error("Bus tracking data unavailable");
          // Extract the first vehicle from the vehicles array
          if (data.vehicles && data.vehicles.length > 0) {
            setTrackData(data.vehicles[0]);
          } else {
            throw new Error("No vehicle data available");
          }
          setCountdown(5); // Reset countdown after fetch
        })
        .catch((err) => {
          console.error(err);
          setTrackError(err.message || "Error loading tracking data");
        })
        .finally(() => {
          setTrackLoading(false);
        });
    };

    // Initial fetch
    fetchTrackingData();

    // Set up interval to refetch every 5 seconds
    const interval = setInterval(fetchTrackingData, 5000);

    return () => clearInterval(interval);
  }, [isTrackMode, stopId, vehicleId, searchParams]);

  // ALL BUSES MODE: fetch all buses en route to the stop
  useEffect(() => {
    if (!showAllBuses || !stopId) {
      setAllBusesData(null);
      setAllBusesError(null);
      setAllBusesLoading(false);
      return;
    }

    const fetchAllBuses = () => {
      setAllBusesLoading(true);
      setAllBusesError(null);

      fetch(`https://badger-transit-dawn-darkness-55.fly.dev/api/track/all/${stopId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load all buses");
          return res.json();
        })
        .then((data) => {
          if (!data.success) throw new Error("All buses data unavailable");
          setAllBusesData(data.vehicles || []);
        })
        .catch((err) => {
          console.error(err);
          setAllBusesError(err.message || "Error loading all buses");
        })
        .finally(() => {
          setAllBusesLoading(false);
        });
    };

    // Initial fetch
    fetchAllBuses();

    // Set up interval to refetch every 5 seconds
    const interval = setInterval(fetchAllBuses, 5000);

    return () => clearInterval(interval);
  }, [showAllBuses, stopId]);

  // Countdown timer effect
  useEffect(() => {
    if (!isTrackMode) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 5;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTrackMode]);

  // Handle locate user
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setIsLocating(false);
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            essential: true,
          });
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message);
      }
    );
  };

  // Handle center on bus
  const handleCenterOnBus = () => {
    setIsBusTrackingActive(!isBusTrackingActive);
  };

  // Build GeoJSON for the bus-to-target-stop polyline (highlighted path)
  const trackLineGeoJson = useMemo(() => {
    if (!trackData || !trackData.polyline) return null;

    const coords = trackData.polyline.map((p) => [Number(p.lon), Number(p.lat)]);

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
      properties: {},
    };
  }, [trackData]);

  // Build GeoJSON for remaining route (from target stop to end)
  const remainingRouteLineGeoJson = useMemo(() => {
    if (!trackData || !trackData.remaining_route_polyline) return null;

    const coords = trackData.remaining_route_polyline.map((p) => [Number(p.lon), Number(p.lat)]);

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
      properties: {},
    };
  }, [trackData]);

  // Build GeoJSON for intermediate stops
  const intermediateStopsGeoJson = useMemo(() => {
    if (!trackData || !trackData.stops_between_enriched) return null;

    const features = trackData.stops_between_enriched
      .filter(stop => stop.lat && stop.lon)
      .map(stop => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(stop.lon), Number(stop.lat)],
        },
        properties: {
          stop_id: stop.stop_id,
          stop_name: stop.stop_name,
        },
      }));

    return {
      type: "FeatureCollection",
      features,
    };
  }, [trackData]);

  // Build GeoJSON for all other buses' polylines (sorted by ETA for z-index)
  const allBusesPolylinesGeoJson = useMemo(() => {
    if (!showAllBuses || !allBusesData || !trackData) return [];

    // Filter out the currently tracked bus and sort by eta_minutes (descending)
    // Latest arrivals render first (bottom), earliest arrivals render last (top)
    const otherBuses = allBusesData
      .filter(bus => bus.vehicle_id !== trackData.vehicle_id)
      .sort((a, b) => {
        const etaA = a.eta_minutes ?? Infinity;
        const etaB = b.eta_minutes ?? Infinity;
        return etaB - etaA;  // Descending - latest first, earliest last (renders on top)
      });

    // Create a GeoJSON object for each bus's polyline
    return otherBuses.map((bus, index) => {
      if (!bus.polyline || bus.polyline.length === 0) return null;

      const coords = bus.polyline.map((p) => [Number(p.lon), Number(p.lat)]);

      return {
        geojson: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
          properties: {
            vehicle_id: bus.vehicle_id,
            route: bus.route,
            eta_minutes: bus.eta_minutes,
          },
        },
        route: bus.route,
        // Lower index = sooner arrival = higher z-index
        // We'll reverse this when rendering (render last = on top)
        zIndex: otherBuses.length - index,
      };
    }).filter(Boolean);
  }, [showAllBuses, allBusesData, trackData]);

  // Extract bus positions for all en-route buses
  const allBusesPositions = useMemo(() => {
    if (!showAllBuses || !allBusesData || !trackData) return [];

    return allBusesData
      .filter(bus => bus.vehicle_id !== trackData.vehicle_id)
      .filter(bus => bus.polyline && bus.polyline.length > 0)
      .map(bus => {
        const firstPoint = bus.polyline[0];
        return {
          vehicle_id: bus.vehicle_id,
          route: bus.route,
          longitude: Number(firstPoint.lon),
          latitude: Number(firstPoint.lat),
          bearing: bus.bearing ? Number(bus.bearing) : 0,
        };
      });
  }, [showAllBuses, allBusesData, trackData]);

  // Extract bus location from start of polyline
  const trackBusPosition = useMemo(() => {
    if (!trackData || !trackData.polyline || trackData.polyline.length === 0) {
      return null;
    }
    const firstPoint = trackData.polyline[0];
    return {
      longitude: Number(firstPoint.lon),
      latitude: Number(firstPoint.lat),
      bearing: trackData.bearing ? Number(trackData.bearing): 0,
    };
  }, [trackData]);

  // Effect to keep map centered on bus when tracking is active
  useEffect(() => {
    if (isBusTrackingActive && trackBusPosition && mapRef.current) {
      autoCenteringRef.current = true;
  
      mapRef.current.flyTo({
        center: [trackBusPosition.longitude, trackBusPosition.latitude],
        zoom: 16,
        essential: true,
        duration: 1000,
      });
    }
  }, [isBusTrackingActive, trackBusPosition]);
  
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
  
    const map = mapRef.current;
  
    const OFF_CENTER_THRESHOLD_METERS = 35; // tweak: 20–75 is typical
  
    const handleMoveEnd = (e) => {
      // If tracking isn't on, nothing to do
      if (!isBusTrackingActive) return;
      if (!trackBusPosition) return;
  
      // Ignore the moveend caused by our own flyTo (auto-centering)
      if (autoCenteringRef.current) {
        autoCenteringRef.current = false;
        return;
      }
  
      // If the event isn't user-initiated, ignore it
      // (Mapbox GL typically includes originalEvent for user gestures)
      if (!e || !e.originalEvent) return;
  
      const center = map.getCenter(); // { lng, lat }
  
      const d = distanceMeters(
        center.lat,
        center.lng,
        trackBusPosition.latitude,
        trackBusPosition.longitude
      );
  
      if (d > OFF_CENTER_THRESHOLD_METERS) {
        setIsBusTrackingActive(false);
      }
    };
  
    map.on("moveend", handleMoveEnd);
  
    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [isMapLoaded, isBusTrackingActive, trackBusPosition]);
  

  // GeoJSON for SmartLaunch circles
  const smartLaunchGeoJson = useMemo(() => {
    const enabled = smartLaunchRules.filter((r) => r.enabled !== false);
    if (enabled.length === 0) return null;

    return {
      type: "FeatureCollection",
      features: enabled.map((rule) =>
        makeCircleFeature(
          rule.center.lat,
          rule.center.lon,
          rule.radiusMeters,
          rule.id,
          rule.stopId
        )
      ),
    };
  }, [smartLaunchRules]);

  // Handle stop selection in selection mode - MOVED BEFORE stopMarkersComponent
  const handleStopClick = useCallback((clickedStopId) => {
    if (!selectMode || !returnTo) {
      // Normal mode: navigate to stop page
      navigate(`/stop/${clickedStopId}`);
      return;
    }

    // Selection mode: add stop to existing list and return
    const currentStops = existingStops ? existingStops.split(',') : [];
    
    // Don't add if already in list
    if (currentStops.includes(clickedStopId)) {
      alert(`Stop ${clickedStopId} is already added to your group!`);
      return;
    }

    currentStops.push(clickedStopId);
    
    const [baseUrl] = returnTo.split('?');
    const [primary, ...others] = currentStops;
    const stopsParam = others.length > 0 ? `?stops=${others.join(',')}` : '';
    
    navigate(`${baseUrl}${stopsParam}`);
  }, [selectMode, returnTo, existingStops, navigate]);

  // Memoize stop markers to prevent flickering during track updates
  const stopMarkersComponent = useMemo(() => {
    if (!showStops) return null;
    return (
      <StopMarkers 
        stops={stops} 
        onStopClick={handleStopClick}
        selectMode={selectMode}
      />
    );
  }, [stops, showStops, selectMode, handleStopClick]);

  // Create a SmartLaunch rule at current map center
  const handleCreateSmartLaunch = () => {
    const stopIdInput = window.prompt(
      "Enter stop ID to auto-open when inside this circle:",
      stopId || ""
    );
    if (!stopIdInput) return;

    const radiusStr = window.prompt(
      "Enter radius in meters for this SmartLaunch circle:",
      "200"
    );
    const radiusMeters = Number(radiusStr);
    const finalRadius =
      Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 200;

    const center =
      smartCenter || {
        lat: 43.0731,
        lon: -89.4012,
      };

    const newRule = {
      id: String(Date.now()),
      name: `SmartLaunch for stop ${stopIdInput}`,
      stopId: stopIdInput,
      center,
      radiusMeters: finalRadius,
      enabled: true,
    };

    setSmartLaunchRules((prev) => {
      const updated = [...prev, newRule];
      saveSmartLaunchRules(updated);
      return updated;
    });
  };

  return (
    <main className="home-root">
      <div className="home-phone-map">
        {/* New Header */}
        <header className="map-header">
          <div className="map-header-top">
            <div className="map-search-box">
              <div className="new-stop-logo">
                <div className="new-stop-logo-circle" aria-hidden="true" />
              </div>

              <button className="new-stop-search" onClick={() => navigate("/chat")} aria-label="Search with BusterChat">
                <span className="map-search-text">"Whats the fastest route to..."</span>
              </button>
            </div>
            <div className="map-header-top-left">
              <button className="map-notif-btn" aria-label="Notifications">
                <span className="new-stop-notif-badge">2</span>
              </button>

              <button className="map-menu-btn" aria-label="Menu">
              </button>
            </div>
          </div>

          <nav className="map-nav" aria-label="Primary navigation">
            <button className="map-nav-btn" onClick={() => navigate("/")}>
              Home
            </button>
            <div className="divider"></div>
            <button className="map-nav-btn" onClick={() => navigate("/recent")}>
              Recent
            </button>
            <div className="map-divider"></div>
            <button className="map-nav-btn" onClick={() => navigate("/map")}>
              Map
            </button>
            <div className="map-divider"></div>
            <button className="map-nav-btn" onClick={() => navigate("/help")}>
              Help
            </button>
          </nav>
        </header>
        
        {/* OVERLAYS */}
        {selectMode && (
          <div 
            className="map-overlay map-select-mode" 
            role="alert" 
            aria-live="polite"
          >
            <div className="map-select-banner">
              <span>🎯 Select a stop to add to your group</span>
              <button 
                onClick={() => navigate(returnTo)} 
                className="map-select-cancel"
                aria-label="Cancel stop selection"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isRouteMode && routeLoading && (
          <div className="map-overlay" role="status" aria-live="polite">
            Loading route {routeId}…
          </div>
        )}
        {isRouteMode && routeError && (
          <div className="map-overlay map-overlay-error" role="alert" aria-live="assertive">
            {routeError}
          </div>
        )}

        {isTrackMode && trackLoading && (
          <div className="map-overlay" role="status" aria-live="polite">
            Tracking bus {vehicleId} from stop {stopId}…
          </div>
        )}
        {isTrackMode && trackError && (
          <div className="map-overlay map-overlay-error" role="alert" aria-live="assertive">
            {trackError}
          </div>
        )}

        <section className="map-page-main" aria-labelledby="map-title">
          <h1 id="map-title" className="visually-hidden">
            {isTrackMode 
              ? `Tracking bus ${vehicleId} from stop ${stopId}` 
              : isRouteMode 
              ? `Route ${routeId} map view`
              : selectMode
              ? "Select a stop to add to group"
              : "Transit map view"}
          </h1>

          <div className="map-page-map-wrapper">
            <MapView
              mapRef={mapRef}
              onLoad={() => setIsMapLoaded(true)}
              onMapClick={(evt) => {
                if (!evt?.lngLat) return;
                const { lat, lng } = evt.lngLat;
                setSmartCenter({ lat, lon: lng });
              }}
              aria-label="Interactive transit map showing bus stops and routes"
            >
              {isMapLoaded && (
                <>
                  {stopMarkersComponent}

                  {/* User location marker */}
                  {userLocation && (
                    <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="bottom">
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#3b82f6", border: "2px solid #fff" }} />
                    </Marker>
                  )}

                  {/* Route mode */}
                  {isRouteMode && routeData && (
                    <RouteLayer routeData={routeData} />
                  )}
                  {isRouteMode && routeId && <BusLayer routeId={routeId} />}

                  {/* ALL BUSES MODE: Render polylines for all other en-route buses */}
                  {showAllBuses && allBusesPolylinesGeoJson.length > 0 && (
                    <>
                      {allBusesPolylinesGeoJson.map((busPolyline, index) => (
                        <Source
                          key={`all-bus-${busPolyline.geojson.properties.vehicle_id}`}
                          id={`all-bus-line-${busPolyline.geojson.properties.vehicle_id}`}
                          type="geojson"
                          data={busPolyline.geojson}
                        >
                          <Layer
                            id={`all-bus-line-layer-${busPolyline.geojson.properties.vehicle_id}`}
                            type="line"
                            paint={{
                              "line-color": getRouteColor(busPolyline.route),
                              "line-width": 9,
                              "line-opacity": .9,
                              "line-emissive-strength": .8,
                              "line-border-color": getRouteColorB(busPolyline.route),
                              "line-border-width": 2,
                            }}
                          />
                        </Source>
                      ))}
                    </>
                  )}

                  {/* Remaining route polyline - shows from target stop to end of route with 50% opacity */}
                  {isTrackMode && remainingRouteLineGeoJson && (
                    <Source
                      id="remaining-route-line"
                      type="geojson"
                      data={remainingRouteLineGeoJson}
                    >
                      <Layer
                        id="remaining-route-line-layer"
                        type="line"
                        paint={{
                          "line-color": trackData?.route ? getRouteColor(trackData.route) : "#ff0000",
                          "line-width": 8,
                          "line-opacity": 0.8,  // 50% opacity
                          "line-emissive-strength": .8,
                          "line-border-color": trackData?.route ? getRouteColorB(trackData.route) : "#ff0000",
                          "line-border-width": 2,
                        }}
                      />
                    </Source>
                  )}

                  {/* Track mode - current tracking polyline (bus to target stop - renders last to appear on top) */}
                  {isTrackMode && trackLineGeoJson && (
                    <Source
                      id="tracked-bus-line"
                      type="geojson"
                      data={trackLineGeoJson}
                    >
                      <Layer
                        id="tracked-bus-line-layer"
                        type="line"
                        paint={{
                          "line-color": trackData?.route ? getRouteColor(trackData.route) : "#ff0000",
                          "line-width": 14,
                          "line-emissive-strength": 1,
                          "line-border-color": trackData?.route ? getRouteColorB(trackData.route) : "#ff0000",
                          "line-border-width": 2,
                        }}
                      />
                    </Source>
                  )}

                  {/* All stops on the remaining route */}
                  {isTrackMode && trackData?.remaining_route_polyline && (
                    <Source
                      id="remaining-route-stops"
                      type="geojson"
                      data={{
                        type: "FeatureCollection",
                        features: trackData.remaining_route_polyline
                          .filter(point => point.type === "S" && point.lat && point.lon)
                          .map(point => ({
                            type: "Feature",
                            geometry: {
                              type: "Point",
                              coordinates: [Number(point.lon), Number(point.lat)],
                            },
                            properties: {
                              stop_id: point.stpid,
                              stop_name: point.stpnm,
                            },
                          })),
                      }}
                    >
                      <Layer
                        id="remaining-route-stops-outer"
                        type="circle"
                      />

                      <Layer
                        id="remaining-route-stops-inner"
                        type="circle"
                        paint={{
                          "circle-radius": 4,
                          "circle-color": "#ffffff",
                          "circle-opacity": 1,  // 50% opacity
                          "circle-stroke-width": 2,
                          "circle-stroke-color": trackData?.route ? getRouteColor(trackData.route) : "#ff0000",
                          "circle-stroke-opacity": 1,  // 50% opacity
                          "circle-emissive-strength": .9,
                        }}
                      />

                    <Layer
                      id="remaining-route-stops-labels"
                      type="symbol"
                      layout={{
                        "text-field": ["get", "stop_name"],
                        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                        "text-size": 11,
                        "text-offset": [0, 1.5],
                        "text-anchor": "top",
                        "text-allow-overlap": false,
                        "text-ignore-placement": false,
                        "symbol-avoid-edges": true,
                      }}
                      paint={{
                        "text-color": "#ffffff",
                        "text-opacity": [
                          "interpolate",
                          ["linear"],
                          ["zoom"],
                          12, 0,   // fully visible at zoom 10 and below
                          14, 1    // fully transparent (invisible) at zoom 12 and above
                        ],
                        "text-halo-color": "#000000",
                        "text-halo-width": 0.7,
                        "text-halo-blur": 2,
                      }}
                    />
                    </Source>
                  )}

                  {/* Intermediate stops on route */}
                  {isTrackMode && intermediateStopsGeoJson && (
                    <Source
                      id="intermediate-stops"
                      type="geojson"
                      data={intermediateStopsGeoJson}
                    >
                      <Layer
  id="intermediate-stops-outer"
  type="circle"
  paint={{
    "circle-radius": 13,
    "circle-color": trackData?.route ? getRouteColorB(trackData.route) : "#ff0000",
    "circle-emissive-strength": 1,
  }}
/>

<Layer
  id="intermediate-stops-inner"
  type="circle"
  paint={{
    "circle-radius": 8, // slightly smaller
    "circle-color": "#ffffff",
    "circle-stroke-width": 4,
    "circle-stroke-color": trackData?.route ? getRouteColor(trackData.route) : "#ff0000",
    "circle-emissive-strength": 1,
  }}
/>

                      <Layer
                        id="intermediate-stops-labels"
                        type="symbol"
                        layout={{
                          "text-field": ["get", "stop_name"],
                          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                          "text-size": 11,
                          "text-offset": [0, 1.5],
                          "text-anchor": "top",
                          "text-allow-overlap": false,
                          "text-ignore-placement": false,
                          "symbol-avoid-edges": true,
                        }}
                        paint={{
                          "text-color": "#ffffff",
                          "text-halo-color": "#000000",
                          "text-halo-width": .7,
                          "text-halo-blur": 2,
                          "text-opacity": [
                          "interpolate",
                          ["linear"],
                          ["zoom"],
                          12, 0,   // fully visible at zoom 10 and below
                          14, 1    // fully transparent (invisible) at zoom 12 and above
                        ],
                          
                        }}
                      />
                    </Source>
                  )}

{isTrackMode && trackBusPosition && (
  <Marker
    longitude={trackBusPosition.longitude}
    latitude={trackBusPosition.latitude}
    //anchor="center"
    //rotation={trackBusPosition.bearing-90}
    //otationAlignment="map"
  >
    <div
      className="map-bus-icon"
      alt={`Bus ${vehicleId} current location`}
      style={{
        backgroundColor: getRouteColor(trackData.route),
        outlineColor: getRouteColorB(trackData.route)
      }}
      >
      <div className="network-icon-bus"></div>
      </div>
  </Marker>
)}

                  {/* Bus icons for all other en-route buses */}
                  {showAllBuses && allBusesPositions.map((busPos) => (
                    <Marker
                      key={`bus-marker-${busPos.vehicle_id}`}
                      longitude={busPos.longitude}
                      latitude={busPos.latitude}
                    >
                      <div
                        className="map-bus-icon"
                        alt={`Bus ${busPos.vehicle_id} current location`}
                        style={{
                          backgroundColor: getRouteColor(busPos.route),
                          outlineColor: getRouteColorB(busPos.route)
                        }}
                      >
                        <div className="network-icon-bus"></div>
                      </div>
                    </Marker>
                  ))}

                  {/* SmartLaunch circles */}
                  {smartLaunchGeoJson && (
                    <Source
                      id="smartlaunch-circles"
                      type="geojson"
                      data={smartLaunchGeoJson}
                    >
                      <Layer
                        id="smartlaunch-fill"
                        type="fill"
                        paint={{
                          "fill-color": "#0000ff",
                          "fill-opacity": 0.12,
                        }}
                      />
                      <Layer
                        id="smartlaunch-outline"
                        type="line"
                        paint={{
                          "line-color": "#0000ff",
                          "line-width": 2,
                        }}
                      />
                    </Source>
                  )}
                </>
              )}
            </MapView>

            {/* overlay buttons on top of the map */}
            <button
              type="button"
              className="map-page-back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back to previous page"
            >
            </button>

            <div className = "map-button-menu">
              <div
                type="button"
                className="map-page-toggle-stops-btn"
                onClick={() => setShowStops(!showStops)}
                aria-label={showStops ? "Hide bus stops" : "Show bus stops"}
                aria-pressed={showStops}
              >
              </div>
              <div className="horizontal-divider"></div>

              {/* Locate user button */}
              <div
                className="location-button" onClick={handleLocateUser}>
              </div>
            </div>
            

            {/* Center on bus button - only show in track mode */}
            {isTrackMode && trackBusPosition && (
              <div>
                <button 
                  className={`center-bus-button ${isBusTrackingActive ? 'active' : ''}`}
                  onClick={handleCenterOnBus}
                  aria-label={isBusTrackingActive ? "Stop following bus" : "Follow bus"}
                  aria-pressed={isBusTrackingActive}
                />
              </div>
            )}

            {/* Countdown timer */}
            {isTrackMode && (
              <div 
                className="map-countdown-timer"
                role="status"
                aria-live="polite"
                aria-label={`Refreshing in ${countdown} seconds`}
              >
                <svg className="countdown-ring" width="44" height="44">
                  <circle
                    className="countdown-ring-circle-bg"
                    cx="22"
                    cy="22"
                    r="18"
                  />
                  <circle
                    className="countdown-ring-circle"
                    cx="22"
                    cy="22"
                    r="18"
                    style={{
                      strokeDashoffset: `${138.23 * (1 - countdown / 5)}`
                    }}
                  />
                </svg>
                <span className="countdown-number">{countdown}</span>
              </div>
            )}
          </div>

          {/* Bus card at bottom when tracking */}
          {isTrackMode && trackData && (
            <section className="map-track-card" aria-labelledby="tracking-title">
              <h2 id="tracking-title" className="visually-hidden">Currently Tracking Bus</h2>
              <TrackBusCard vehicle={trackData} navigate={navigate} />
            </section>
          )}
        </section>

      </div>
    </main>
  );
}

export default MapPage;