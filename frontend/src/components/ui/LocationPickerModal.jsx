import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { X, MapPin, Save, Upload, Image as ImageIcon } from "lucide-react";
import L from "leaflet";

const pickerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSave,
  initialCenter = [-7.2575, 112.7521],
}) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [demandLocation, setDemandLocation] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file (PNG, JPG, JPEG)");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size must be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        setPhoto(result);
        setPhotoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto("");
    setPhotoPreview(null);
    // Reset file input
    const fileInput = document.getElementById("photo-upload");
    if (fileInput) fileInput.value = "";
  };

  const handleSave = () => {
    if (!selectedLocation) {
      alert("Please select a location on the map");
      return;
    }
    if (!locationName.trim()) {
      alert("Please enter a location name");
      return;
    }
    if (!demandLocation || parseInt(demandLocation, 10) < 1) {
      alert("Please enter a valid demand quantity (minimum 1)");
      return;
    }

    onSave({
      name: locationName.trim(),
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      demand: parseInt(demandLocation, 10),
      photo: photo || undefined,
    });

    // Reset state
    setSelectedLocation(null);
    setLocationName("");
    setDemandLocation("");
    setPhoto("");
    setPhotoPreview(null);
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setLocationName("");
    setDemandLocation("");
    setPhoto("");
    setPhotoPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 48px)" }}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin size={24} />
            <div>
              <h2 className="text-xl font-semibold">Pick Location</h2>
              <p className="text-sm opacity-90">
                Click on the map to select a location
              </p>
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
        <div style={{ height: "450px" }}>
          <MapContainer
            center={initialCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
                <div className="text-xs text-blue-600 mb-1 font-semibold">
                  Selected Coordinates
                </div>
                <div className="text-sm text-blue-900 font-mono">
                  Lat: {selectedLocation.lat.toFixed(6)}, Lng:{" "}
                  {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            )}

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Customer A, Warehouse 1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Demand Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Demand Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={demandLocation}
                  onChange={(e) => setDemandLocation(e.target.value)}
                  placeholder="e.g., 20"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Photo (Optional)
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer group"
                  >
                    <Upload
                      size={18}
                      className="text-gray-400 group-hover:text-green-600"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-green-700">
                      {photoPreview ? "Change Photo" : "Upload Photo"}
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Max 2MB • PNG, JPG, JPEG
                  </p>
                </div>

                {/* Photo Preview */}
                {photoPreview && (
                  <div className="relative group">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-green-200 shadow-sm"
                    />
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100"
                      title="Remove photo"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all" />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  !selectedLocation || !locationName.trim() || !demandLocation
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
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
