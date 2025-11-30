import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { X, MapPin, Save } from 'lucide-react';
import L from 'leaflet';

const pickerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function LocationPickerModal({ isOpen, onClose, onSave, initialCenter = [-7.2575, 112.7521] }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [demandLocation, setDemandLocation] = useState('')

  const handleSave = () => {
    if (!selectedLocation) {
      alert('Please select a location on the map');
      return;
    }
    if (!locationName.trim()) {
      alert('Please enter a location name');
      return;
    }

    onSave({
      name: locationName.trim(),
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      demand: parseInt(demandLocation,10)
    });

    // Reset state
    setSelectedLocation(null);
    setLocationName('');
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setLocationName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 bg-opacity-15 p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden overflow-y-auto" style={{ maxHeight: 'calc(100vh - 48px)' }}>
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin size={24} />
            <div>
              <h2 className="text-xl font-semibold">Pick Location</h2>
              <p className="text-sm opacity-90">Click on the map to select a location</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Map */}
        <div style={{ height: '500px' }}>
          <MapContainer
            center={initialCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <MapClickHandler onLocationSelect={setSelectedLocation} />
            
            {selectedLocation && (
              <Marker 
                position={[selectedLocation.lat, selectedLocation.lng]} 
                icon={pickerIcon}
              />
            )}
          </MapContainer>
        </div>

        {/* Footer Form */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="space-y-4">
            {/* Selected Coordinates Display */}
            {selectedLocation && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-600 mb-1">Selected Coordinates</div>
                <div className="text-sm text-blue-900 font-mono">
                  Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            )}

            {/* Location Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Name *
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Enter location name (e.g., Customer A, Warehouse 1)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Demand Barang
              </label>
              <input
                type="text"
                value={demandLocation}
                onChange={(e) => setDemandLocation(e.target.value)}
                placeholder="Enter Demand Quantity (e.g., 20)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedLocation || !locationName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={18} />
                <span>Save Location</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}