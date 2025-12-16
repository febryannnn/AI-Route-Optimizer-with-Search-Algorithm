import React from "react";
import { MapPin, Plus, Trash2, Image as ImageIcon } from "lucide-react";

const LocationManager = ({
  locations,
  onDeleteLocation,
  onOpenLocationPicker,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <MapPin size={20} className="text-red-500" />
          Locations Input
        </h3>
        <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded text-xs font-bold">
          {locations.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-2 mb-4 custom-scrollbar">
        {locations.map((loc, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors group"
          >
            {/* Photo Thumbnail */}
            <div className="flex-shrink-0">
              {loc.photo ? (
                <img
                  src={loc.photo}
                  alt={loc.name}
                  className="w-30 h-20 rounded-lg object-cover border-2 border-gray-200"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "";
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                    idx === 0
                      ? "from-red-100 to-red-200"
                      : "from-blue-100 to-blue-200"
                  } flex items-center justify-center`}
                >
                  {idx === 0 ? (
                    <span className="text-xl">🏭</span>
                  ) : (
                    <MapPin size={20} className="text-blue-600" />
                  )}
                </div>
              )}
            </div>

            {/* Location Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 text-sm truncate">
                {loc.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </span>
                {loc.demand > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-blue-600">
                      {loc.demand} units
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Delete Button */}
            {idx > 0 && (
              <button
                onClick={() => onDeleteLocation(loc)}
                className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onOpenLocationPicker}
        className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Add New Location
      </button>
    </div>
  );
};

export default LocationManager;
