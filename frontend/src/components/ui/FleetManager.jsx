import React, { useState } from "react";
import { Car, Trash } from "lucide-react";

const FleetManager = ({ vehicles, onUpdateVehicle, onDeleteVehicle }) => {
  const [vehicleType, setVehicleType] = useState("Mobil");
  const [vehicleCount, setVehicleCount] = useState(1);

  const handleUpdate = () => {
    onUpdateVehicle({ type: vehicleType, count: vehicleCount });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Car size={20} className="text-green-600" />
        Fleet Manager
      </h3>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Type
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Mobil">Mobil</option>
              <option value="Motor">Motor</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Count
            </label>
            <input
              type="number"
              min="1"
              value={vehicleCount}
              onChange={(e) => setVehicleCount(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleUpdate}
          className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Update / Add Vehicle
        </button>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  v.type === "Mobil"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-orange-100 text-orange-600"
                }`}
              >
                <Car size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-800">
                  {v.type}
                </div>
                <div className="text-xs text-gray-500">
                  Count: <span className="font-bold">{v.count}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Capacity: <span className="font-bold">{v.capacity}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onDeleteVehicle(v)}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash size={16} />
            </button>
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-2">
            No vehicles added yet
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetManager;
