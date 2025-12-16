import React from "react";
import { Settings, MapPin, Car, Calendar } from "lucide-react";

const ResultsPanel = ({
  finalCost,
  vehicleRoutes,
  vehicleTypes,
  totalVehicles,
  algorithm,
  onOpenSchedule,
}) => {
  if (finalCost === null || vehicleRoutes.length === 0) {
    return (
      <div className="lg:col-span-4 h-full flex flex-col gap-6">
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-full flex flex-col items-center justify-center text-center text-gray-400">
          <Settings size={40} className="mb-3 opacity-20" />
          <p>
            Results will appear here
            <br />
            after optimization
          </p>
        </div>
      </div>
    );
  }

  const getAlgorithmName = () => {
    switch (algorithm) {
      case "tabu-search":
        return "Tabu Search";
      case "simulated-annealing":
        return "Simulated Annealing";
      case "genetic":
        return "Genetic Algorithm";
      default:
        return algorithm;
    }
  };

  return (
    <div className="lg:col-span-4 h-full flex flex-col gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
            <Settings size={18} className="text-blue-600" />
            Final Results
          </h4>
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
            {getAlgorithmName()}
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
          {/* Total Distance */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <MapPin size={14} />
              <span>Total Distance</span>
            </div>
            <div className="text-3xl font-bold text-blue-700">
              {(finalCost / 1000).toFixed(2)}{" "}
              <span className="text-base font-normal text-gray-500">km</span>
            </div>
          </div>

          {/* Total Vehicles */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Car size={14} />
              <span>Total Vehicles Used</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {totalVehicles}{" "}
              <span className="text-base font-normal text-gray-500">Units</span>
            </div>
          </div>

          {/* Vehicle Details List */}
          <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Vehicle Details
              </h5>
            </div>
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
              {vehicleRoutes.map((route, idx) => {
                const vehicleType = vehicleTypes[idx] || "Vehicle";
                const totalStops = route.length - 2;
                const vehicleDistance = route.reduce((sum, loc, i) => {
                  if (i === 0) return 0;
                  const prev = route[i - 1];
                  const dist = Math.sqrt(
                    Math.pow((loc.lat - prev.lat) * 111, 2) +
                      Math.pow((loc.lng - prev.lng) * 111, 2)
                  );
                  return sum + dist;
                }, 0);

                const vehicleColor =
                  vehicleType === "Mobil"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-orange-100 text-orange-700 border-orange-200";

                return (
                  <div
                    key={idx}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg ${vehicleColor} border flex items-center justify-center`}
                        >
                          <Car size={14} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {vehicleType} {idx + 1}
                          </div>
                          <div className="text-xs text-gray-500">
                            Vehicle #{idx + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-gray-500 mb-0.5">Stops</div>
                        <div className="font-bold text-gray-900">
                          {totalStops}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-gray-500 mb-0.5">Distance</div>
                        <div className="font-bold text-gray-900">
                          {vehicleDistance.toFixed(2)} km
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* View Schedule Button */}
        <button
          onClick={onOpenSchedule}
          className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Calendar size={18} />
          View Detailed Schedule
        </button>
      </div>
    </div>
  );
};

export default ResultsPanel;
