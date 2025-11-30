import React, { useState } from "react";
import {
  X,
  Clock,
  MapPin,
  Package,
  Truck,
  Calendar,
  Navigation,
} from "lucide-react";

const ScheduleModal = ({
  isOpen,
  onClose,
  vehicleRoutes,
  vehicleTypes,
  finalCost,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState(0);

  if (!isOpen) return null;

  // Generate dummy schedule data based on routes
  const generateSchedule = (route, vehicleType, index) => {
    const baseTime = new Date();
    baseTime.setHours(8, 0, 0, 0); // Start at 8:00 AM

    let currentTime = new Date(baseTime);
    const schedule = [];

    route.forEach((location, idx) => {
      const isDepot =
        location.name?.toLowerCase().includes("depot") || idx === 0;
      const isReturnToDepot = idx > 0 && idx < route.length - 1 && isDepot;
      const isFinalReturn = idx === route.length - 1;

      if (idx === 0) {
        // Depot start (pertama kali)
        schedule.push({
          location: location.name,
          lat: location.lat,
          lng: location.lng,
          arrivalTime: null,
          departureTime: new Date(currentTime),
          duration: 0,
          distance: 0,
          demand: location.demand || 0,
          action: "Departure",
          notes: "Start route - Trip 1",
          isDepot: true,
          tripNumber: 1,
        });
      } else if (isReturnToDepot) {
        // Kembali ke depot di tengah route (multi-trip)
        const travelTime = Math.floor(Math.random() * 20 + 10); // 10-30 minutes
        currentTime = new Date(currentTime.getTime() + travelTime * 60000);
        const arrivalTime = new Date(currentTime);

        // Unload time
        const unloadTime = 10; // 10 minutes
        currentTime = new Date(currentTime.getTime() + unloadTime * 60000);
        const departureTime = new Date(currentTime);

        const distance = (Math.random() * 5 + 2).toFixed(2); // 2-7 km

        // Hitung trip number berdasarkan berapa kali sudah kembali ke depot
        const tripNumber = schedule.filter((s) => s.isDepot).length + 1;

        schedule.push({
          location: location.name,
          lat: location.lat,
          lng: location.lng,
          arrivalTime,
          departureTime,
          duration: travelTime,
          distance: parseFloat(distance),
          demand: 0,
          action: "Return to Depot",
          notes: `Unload & reload - Start Trip ${tripNumber}`,
          serviceTime: unloadTime,
          isDepot: true,
          tripNumber,
        });
      } else if (isFinalReturn) {
        // Return to depot (akhir route)
        const travelTime = Math.floor(Math.random() * 20 + 15); // 15-35 minutes
        currentTime = new Date(currentTime.getTime() + travelTime * 60000);
        const distance = (Math.random() * 5 + 3).toFixed(2); // 3-8 km

        schedule.push({
          location: location.name,
          lat: location.lat,
          lng: location.lng,
          arrivalTime: new Date(currentTime),
          departureTime: null,
          duration: travelTime,
          distance: parseFloat(distance),
          demand: 0,
          action: "Arrival",
          notes: "End route - All deliveries completed",
          isDepot: true,
        });
      } else {
        // Customer location (delivery)
        const travelTime = Math.floor(Math.random() * 25 + 10); // 10-35 minutes travel
        currentTime = new Date(currentTime.getTime() + travelTime * 60000);
        const arrivalTime = new Date(currentTime);

        const serviceTime = Math.floor(Math.random() * 10 + 5); // 5-15 minutes service
        currentTime = new Date(currentTime.getTime() + serviceTime * 60000);
        const departureTime = new Date(currentTime);

        const distance = (Math.random() * 8 + 2).toFixed(2); // 2-10 km

        schedule.push({
          location: location.name,
          lat: location.lat,
          lng: location.lng,
          arrivalTime,
          departureTime,
          duration: travelTime,
          distance: parseFloat(distance),
          demand: location.demand || 0,
          action: "Delivery",
          notes: `Service time: ${serviceTime} min`,
          serviceTime,
          isDepot: false,
        });
      }
    });

    return schedule;
  };

  const scheduleData = vehicleRoutes.map((route, idx) => ({
    vehicleId: idx + 1,
    vehicleType: vehicleTypes[idx],
    route: route,
    schedule: generateSchedule(route, vehicleTypes[idx], idx),
    totalStops: route.length - 2, // Exclude depot start and end
    totalDemand: route.reduce((sum, loc) => sum + (loc.demand || 0), 0),
  }));

  const formatTime = (date) => {
    if (!date) return "-";
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const currentVehicle = scheduleData[selectedVehicle];
  const totalDistance = currentVehicle?.schedule
    .reduce((sum, s) => sum + s.distance, 0)
    .toFixed(2);
  const totalDuration = currentVehicle?.schedule.reduce(
    (sum, s) => sum + s.duration + (s.serviceTime || 0),
    0
  );
  const startTime = currentVehicle?.schedule[0]?.departureTime;
  const endTime =
    currentVehicle?.schedule[currentVehicle.schedule.length - 1]?.arrivalTime;

  const vehicleColors = {
    Motor: "bg-blue-500",
    Mobil: "bg-green-500",
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-opacity-10 bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Route Schedule
              </h2>
              <p className="text-sm text-gray-500">
                Detailed delivery schedule for all vehicles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Vehicle Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-200 overflow-x-auto">
          {scheduleData.map((vehicle, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedVehicle(idx)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-all whitespace-nowrap ${
                selectedVehicle === idx
                  ? "bg-blue-50 border-b-2 border-blue-500 text-blue-700"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Truck size={18} />
              <span className="font-medium">
                {vehicle.vehicleType} {vehicle.vehicleId}
              </span>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                {vehicle.totalStops} stops
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Navigation size={18} />
                <span className="text-sm font-medium">Total Distance</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {totalDistance} km
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Clock size={18} />
                <span className="text-sm font-medium">Total Duration</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatDuration(totalDuration)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <Package size={18} />
                <span className="text-sm font-medium">Total Demand</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {currentVehicle?.totalDemand}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <MapPin size={18} />
                <span className="text-sm font-medium">Stops</span>
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {currentVehicle?.totalStops}
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Route Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Vehicle Type:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      vehicleColors[currentVehicle?.vehicleType]
                    }`}
                  ></span>
                  <span className="font-medium text-gray-900">
                    {currentVehicle?.vehicleType}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Vehicle ID:</span>
                <div className="font-medium text-gray-900 mt-1">
                  Vehicle {currentVehicle?.vehicleId}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Start Time:</span>
                <div className="font-medium text-gray-900 mt-1">
                  {formatTime(startTime)}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Estimated End:</span>
                <div className="font-medium text-gray-900 mt-1">
                  {formatTime(endTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Timeline */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Detailed Schedule</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {currentVehicle?.schedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Timeline indicator */}
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.action === "Departure"
                            ? "bg-green-100 text-green-600"
                            : item.action === "Return to Depot"
                            ? "bg-yellow-100 text-yellow-600"
                            : item.action === "Arrival"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {item.action === "Departure"
                          ? "🚀"
                          : item.action === "Return to Depot"
                          ? "🔄"
                          : item.action === "Arrival"
                          ? "🏁"
                          : "📦"}
                      </div>
                      {idx < currentVehicle.schedule.length - 1 && (
                        <div className="w-0.5 h-16 bg-gray-300 my-2"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {item.location}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.action === "Departure"
                              ? "bg-green-100 text-green-700"
                              : item.action === "Return to Depot"
                              ? "bg-yellow-100 text-yellow-700"
                              : item.action === "Arrival"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {item.action}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {item.arrivalTime && (
                          <div>
                            <span className="text-gray-500">Arrival:</span>
                            <div className="font-medium text-gray-900">
                              {formatTime(item.arrivalTime)}
                            </div>
                          </div>
                        )}
                        {item.departureTime && (
                          <div>
                            <span className="text-gray-500">Departure:</span>
                            <div className="font-medium text-gray-900">
                              {formatTime(item.departureTime)}
                            </div>
                          </div>
                        )}
                        {item.duration > 0 && (
                          <div>
                            <span className="text-gray-500">Travel Time:</span>
                            <div className="font-medium text-gray-900">
                              {formatDuration(item.duration)}
                            </div>
                          </div>
                        )}
                        {item.distance > 0 && (
                          <div>
                            <span className="text-gray-500">Distance:</span>
                            <div className="font-medium text-gray-900">
                              {item.distance} km
                            </div>
                          </div>
                        )}
                        {item.demand > 0 && (
                          <div>
                            <span className="text-gray-500">Demand:</span>
                            <div className="font-medium text-gray-900">
                              {item.demand} units
                            </div>
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing schedule for{" "}
              <span className="font-medium text-gray-900">
                {currentVehicle?.vehicleType} {currentVehicle?.vehicleId}
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
