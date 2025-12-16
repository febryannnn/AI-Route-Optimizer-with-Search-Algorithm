import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const depotIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const carAnimIcon = L.divIcon({
  html: `<div style="font-size: 24px; transform: rotate(0deg);">🚗</div>`,
  className: "vehicle-marker",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const motorAnimIcon = L.divIcon({
  html: `<div style="font-size: 24px; transform: rotate(0deg);">🏍️</div>`,
  className: "vehicle-marker",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const vehicleColors = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const MapVisualization = ({
  locations,
  vehiclePaths,
  vehicleTypes,
  isVisualizing,
  vehiclePositions,
  currentState,
}) => {
  return (
    <div className="lg:col-span-8 flex flex-col h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col min-h-[500px]">
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Route Map</h2>
            <p className="text-sm text-gray-500">Live visualization</p>
          </div>
          {currentState && (
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-600 border border-gray-200">
              Iter: {currentState.iteration} | Cost:{" "}
              {currentState.cost?.toFixed(2)}
            </div>
          )}
        </div>

        <div className="relative flex-1">
          <MapContainer
            center={[-7.2575, 112.7521]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <MapUpdater center={[-7.2575, 112.7521]} zoom={12} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {locations.map((loc, idx) => (
              <Marker
                key={idx}
                position={[loc.lat, loc.lng]}
                icon={idx === 0 ? depotIcon : deliveryIcon}
              >
                <Popup>
                  <div className="font-semibold">{loc.name}</div>
                  <div className="text-xs text-gray-500">
                    Demand: {loc.demand || 0}
                  </div>
                </Popup>
              </Marker>
            ))}

            {vehiclePaths.length > 0 &&
              vehiclePaths.map((path, idx) => {
                if (!path || path.length === 0) return null;
                const positions = path.map((coord) => [coord[1], coord[0]]);
                return (
                  <Polyline
                    key={`v-${idx}`}
                    positions={positions}
                    color={vehicleColors[idx % vehicleColors.length]}
                    weight={4}
                    opacity={0.8}
                  />
                );
              })}

            {isVisualizing &&
              vehiclePositions.map((vPos, idx) => (
                <Marker
                  key={`anim-${idx}`}
                  position={vPos.position}
                  icon={
                    vehicleTypes[idx] === "Mobil" ? carAnimIcon : motorAnimIcon
                  }
                  zIndexOffset={1000}
                />
              ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default MapVisualization;
