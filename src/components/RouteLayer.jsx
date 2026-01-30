// src/components/RouteLayer.jsx
import { useEffect } from "react";
import { Source, Layer, useMap } from "react-map-gl/maplibre";
import busIcon from "../assets/btv2busicon.svg";
import longBusIcon from "../assets/btv2longbusicon.svg";

export default function RouteLayer({ routeData }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return;

    const addIcon = (name, src) => {
      if (map.hasImage(name)) return;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        if (!map.hasImage(name)) {
          const ratio = window.devicePixelRatio || 2;
          map.addImage(name, img, { pixelRatio: ratio });
        }
      };

      img.src = src;
    };

    addIcon("btv2-bus-icon", busIcon);
    addIcon("btv2-long-bus-icon", longBusIcon);
  }, [map]);

  const lineFeatures =
    (routeData.route_polylines || []).map((segment, idx) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: (segment.polyline || []).map((pt) => [pt.lon, pt.lat]),
      },
      properties: {
        id: `${routeData.route}-${segment.direction}-${idx}`,
        direction: segment.direction,
      },
    })) || [];

  const vehicleFeatures =
    (routeData.vehicles || []).map((v, idx) => {
      const vehicleId =
        v.vehicle_id != null ? String(v.vehicle_id) : String(idx);

      // 4-digit vehicle ID -> long bus icon, 3-digit -> regular bus icon
      const iconName =
        vehicleId.length === 4 ? "btv2-long-bus-icon" : "btv2-bus-icon";

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(v.lon), Number(v.lat)],
        },
        properties: {
          id: vehicleId,
          destination: v.destination,
          occupancy: v.occupancy,
          bearing: v.bearing != null ? Number(v.bearing) : 0,
          icon: iconName,
        },
      };
    }) || [];

  const routeKey = routeData.route || "route";

  return (
    <>
      <Source
        id={`route-lines-${routeKey}`}
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: lineFeatures,
        }}
      >
        <Layer
          id={`route-line-layer-${routeKey}`}
          type="line"
          paint={{
            "line-color": "#111111",
            "line-width": 3,
          }}
        />
      </Source>

      <Source
        id={`route-vehicles-${routeKey}`}
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: vehicleFeatures,
        }}
      >
        <Layer
          id={`route-vehicle-layer-${routeKey}`}
          type="symbol"
          layout={{
            // Use per-feature icon
            "icon-image": ["coalesce", ["get", "icon"], "btv2-bus-icon"],

            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8, 0.025,
              12, 0.025,
              16, 0.1,
            ],

            // 🔁 Rotate based on bearing, with a different offset
            // Regular bus: subtract 90 (icon drawn pointing east)
            // Long bus: no offset (icon drawn pointing north)
            "icon-rotate": [
              "-",
              ["coalesce", ["get", "bearing"], 0],
              [
                "case",
                ["==", ["get", "icon"], "btv2-long-bus-icon"], -90,   // long bus
                90                                                   // regular bus
              ]
            ],

            "icon-rotation-alignment": "map",
            "icon-anchor": "center",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />

      </Source>
    </>
  );
}
