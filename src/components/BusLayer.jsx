import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import busIcon from "../assets/btv2busicon.svg";

const routeColors = {
  A2: "#FF5810", A1: "#FF5810", A: "#FF5810", B: "#9ACE00", C: "#FF5810",
  D1: "#FF5810", D: "#FF5810", D2: "#FF5810", E: "#FFD133", F: "#7860FF", G: "#33FFF3",
  H: "#FF8F33", J: "#337BFF", L: "#33FF8A", O: "#FF5810", P: "#33C1A8",
  R: "#FF5810", S: "#6F61FF", W: "#61C1FF", 28: "#FF5810", 38: "#FF5810",
  55: "#61FFA8", 60: "#FF5733", 61: "#33C1FF", 62: "#33FF57", 63: "#FF33A8",
  64: "#FFD133", 65: "#8D33FF", 75: "#33FFF3", 80: "#FF8F33", 84: "#337BFF",
};

function BusLayer({ stopId }) {
  const mapInstance = useMap();

  // Load bus icon once when map is ready
  useEffect(() => {
    const map = mapInstance.current?.getMap();
    if (!map || map.hasImage("bus-icon")) return;

    map.loadImage(busIcon, (error, image) => {
      if (error) {
        console.error("Failed to load bus icon:", error);
        return;
      }
      if (!map.hasImage("bus-icon")) {
        map.addImage("bus-icon", image, { pixelRatio: 2 });
      }
    });
  }, [mapInstance]);

  // Handle bus data and rendering
  useEffect(() => {
    const map = mapInstance.current?.getMap();
    if (!map) return;

    const sourceId = "buses-source";
    const routeSourceId = "routes-source";
    const busLayerId = "buses-layer";
    const routeLayerId = "routes-layer";

    const fetchAndRenderBuses = async () => {
      try {
        const response = await fetch(
          `https://badger-transit-dawn-darkness-55.fly.dev/api/predictions/${stopId}`
        );
        const data = await response.json();
        const results = data.results || [];

        // ✅ Only keep earliest bus per route
        const earliestByRoute = {};
        for (const bus of results) {
          if (!bus.route || !bus.polyline || bus.polyline.length < 2) continue;
          const eta = bus.eta_minutes ?? Infinity;
          if (
            !earliestByRoute[bus.route] ||
            eta < earliestByRoute[bus.route].eta_minutes
          ) {
            earliestByRoute[bus.route] = bus;
          }
        }

        // 🟡 Bus points (all visible)
        const busFeatures = results
          .filter((bus) => bus.vehicle_lat && bus.vehicle_lon)
          .map((bus) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [bus.vehicle_lon, bus.vehicle_lat],
            },
            properties: {
              route: bus.route,
              destination: bus.destination,
              stopsAway: bus.stops_away,
              occupancy: bus.occupancy || "Unknown",
            },
          }));

        // 🟩 Use backend polyline with dynamic offset
        const routeEntries = Object.values(earliestByRoute);
        const routeFeatures = routeEntries.map((bus, index) => {
          const coords = bus.polyline.map((p) => [p.lon, p.lat]);
          
          const totalRoutes = routeEntries.length;
          const spacing = 6; // pixels between routes
          
          // Center the routes dynamically
          // 1 route:  offset = 0
          // 2 routes: offsets = -3, 3
          // 3 routes: offsets = -6, 0, 6
          // 4 routes: offsets = -9, -3, 3, 9
          const offset = (index - (totalRoutes - 1) / 2) * spacing;

          return {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {
              route: bus.route,
              color: routeColors[bus.route] || "#FFD60A",
              offset: offset, // Store computed offset
            },
          };
        });

        const busGeoJSON = { type: "FeatureCollection", features: busFeatures };
        const routeGeoJSON = { type: "FeatureCollection", features: routeFeatures };

        // 🔁 Update or create layers
        if (map.getSource(sourceId)) {
          map.getSource(sourceId).setData(busGeoJSON);
          map.getSource(routeSourceId).setData(routeGeoJSON);
        } else {
          map.addSource(sourceId, { type: "geojson", data: busGeoJSON });
          map.addSource(routeSourceId, { type: "geojson", data: routeGeoJSON });

          // 🚍 Route lines with rounded ends and zoom-dependent width
          map.addLayer({
            id: routeLayerId,
            type: "line",
            source: routeSourceId,
            layout: {
              "line-cap": "round",
              "line-join": "round"
            },
            paint: {
              "line-color": ["get", "color"],
              // Zoom-dependent line width
              "line-width": [
                "interpolate",
                ["exponential", 1.5],
                ["zoom"],
                13, 2,    // At zoom 13: 2px wide
                15, 5,    // At zoom 15: 5px wide
                17, 8,    // At zoom 17: 8px wide
                18, 10    // At zoom 18: 10px wide
              ],
              "line-opacity": 0.9,
            },
          });

          // 🚌 Bus icon markers
          map.addLayer({
            id: busLayerId,
            type: "symbol",
            source: sourceId,
            layout: {
              "icon-image": "bus-icon",
              "icon-size": 0.6,
              "icon-allow-overlap": true,
            },
          });

          // 🪄 Popups
          map.on("click", busLayerId, (e) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const { route, destination, stopsAway, occupancy } =
              feature.properties;

            new maplibregl.Popup()
              .setLngLat(feature.geometry.coordinates)
              .setHTML(
                `<b>Route ${route}</b><br/>${destination}<br/>Stops away: ${stopsAway}<br/>Occupancy: ${occupancy}`
              )
              .addTo(map);
          });

          map.on("mouseenter", busLayerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", busLayerId, () => {
            map.getCanvas().style.cursor = "";
          });
        }
      } catch (error) {
        console.error("Failed to fetch bus data:", error);
      }
    };

    fetchAndRenderBuses();
    const interval = setInterval(fetchAndRenderBuses, 20000);

    return () => {
      clearInterval(interval);
      if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
      if (map.getLayer(busLayerId)) map.removeLayer(busLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (map.getSource(routeSourceId)) map.removeSource(routeSourceId);
    };
  }, [mapInstance, stopId]);

  return null;
}

export default BusLayer;