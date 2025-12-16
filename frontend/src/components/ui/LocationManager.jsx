import React from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";

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
            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors group"
          >
            <div className="min-w-0">
              <div className="font-medium text-gray-800 text-sm truncate">
                {loc.name}
              </div>
              <div className="text-xs text-gray-500">
                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </div>
            </div>
            {idx > 0 && (
              <button
                onClick={() => onDeleteLocation(loc)}
                className="text-gray-300 hover:text-red-500 transition-colors"
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
