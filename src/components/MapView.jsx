// src/components/MapView.jsx
import { useRef } from "react";
import Map from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./MapView.css";

function MapView({
  children,
  onMapClick,
  onLoad,
  viewState,
  onMove,
  mapRef: externalMapRef,
}) {
  const internalMapRef = useRef(null);
  const mapRef = externalMapRef || internalMapRef;

  const defaultInitialViewState = {
    longitude: -89.4012,
    latitude: 43.0731,
    zoom: 16,
  };

  const handleMapLoad = (event) => {
    const map = event.target;
    mapRef.current = map;

    // --- FIX FOR DARKNESS ---
    // 1. Remove Fog (Global darkening effect)
    if (map.getFog()) {
      map.setFog(null);
    }
    // 2. Force light intensity (Overrides style-based dimming)
    if (map.getLight()) {
      map.setLight({ intensity: 0.5 }); 
    }
    // ------------------------

    if (onLoad) {
      onLoad(event);
    }
  };

  return (
    <div className="map-view-root" style={{ width: "100%", height: "100%", position: "relative" }}>
      <Map
        {...(viewState ? { ...viewState } : {})}
        initialViewState={viewState ? undefined : defaultInitialViewState}
        minZoom={11.75}
        maxZoom={18}
        mapStyle="mapbox://styles/ben-hurwitz/cmixuervv003501rxg4mjgm6k"
        mapboxAccessToken="pk.eyJ1IjoiYmVuLWh1cndpdHoiLCJhIjoiY21oOGF0cjVjMDlzdDJscG9oemZpZ2J0ZSJ9.WDhxlwNRVnVxBlbDIgrppQ"
        onClick={onMapClick}
        onLoad={handleMapLoad}
        onMove={onMove}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Map>
    </div>
  );
}

export default MapView;