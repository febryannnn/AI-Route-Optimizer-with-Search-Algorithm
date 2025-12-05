import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Zap,
  Plus,
  Trash2,
  Settings,
  Car,
  Trash,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "./services/api";
import axios from "axios";
import LocationPickerModal from "./components/ui/LocationPickerModal";
import ScheduleModal from "./components/ui/ScheduleModal";
import AlgorithmPanel from "./components/ui/AlgorithmPanel";
import Navbar from "./components/ui/Navbar";

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

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function App() {

    const [locations, setLocations] = useState([]);
    const [algorithm, setAlgorithm] = useState("hill-climbing");
    const [solving, setSolving] = useState(false);
    const [currentIteration, setCurrentIteration] = useState(0);
    const [history, setHistory] = useState([]);
    const [roadPath, setRoadPath] = useState([]);
    const [finalRoute, setFinalRoute] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(200);
    const [newLocation, setNewLocation] = useState({
      lat: "",
      lng: "",
      name: "",
    });
    const [error, setError] = useState(null);
    const [showParams, setShowParams] = useState(false);
    const [graphInput, setGraphInput] = useState("");
    const [startNode, setStartNode] = useState("");
    const [goalNode, setGoalNode] = useState("");
    const [addMode, setAddMode] = useState(false);
    const [tempLocation, setTempLocation] = useState(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [deletedLocation, setDeletedLocation] = useState(null);
    const [isDeleted, setIsDeleted] = useState(false);
    const [finalCost, setFinalCost] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [isUpdatedVehicle, setIsUpdatedVehicle] = useState(false);
    const [vehicleType, setVehicleType] = useState("Mobil");
    const [vehicleCount, setVehicleCount] = useState(1);
    const [vehicleRoutes, setVehicleRoutes] = useState([]);
    const [vehiclePaths, setVehiclePaths] = useState([]);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [totalVehicles, setTotalVehicles] = useState(0);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [isVisualizing, setIsVisualizing] = useState(false);
    const [vehiclePositions, setVehiclePositions] = useState([]);
    const [animationProgress, setAnimationProgress] = useState(0);

  const interpolatePosition = (start, end, progress) => {
    return [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ];
  };

  const startVisualization = () => {
    if (!vehiclePaths || vehiclePaths.length === 0) {
      alert("Solve route terlebih dahulu dengan Genetic Algorithm!");
      return;
    }

    setIsVisualizing(true);
    setAnimationProgress(0);

    // Initialize vehicle positions at depot
    const initialPositions = vehiclePaths.map((path) => ({
      position: [path[0][1], path[0][0]], // [lat, lng]
      pathIndex: 0,
      segmentProgress: 0,
    }));
    setVehiclePositions(initialPositions);
  };

  const stopVisualization = () => {
    setIsVisualizing(false);
    setVehiclePositions([]);
    setAnimationProgress(0);
  };

  useEffect(() => {
    if (!isVisualizing || vehiclePaths.length === 0) return;

    const animationTimer = setInterval(() => {
      setVehiclePositions((prevPositions) => {
        return prevPositions.map((vPos, vIdx) => {
          const path = vehiclePaths[vIdx];
          if (!path || vPos.pathIndex >= path.length - 1) return vPos;

          let newSegmentProgress = vPos.segmentProgress + 0.5; // Speed control
          let newPathIndex = vPos.pathIndex;

          // Move to next segment
          if (newSegmentProgress >= 1) {
            newSegmentProgress = 0;
            newPathIndex++;
          }

          // Stop if reached end
          if (newPathIndex >= path.length - 1) {
            return { ...vPos, pathIndex: path.length - 1, segmentProgress: 1 };
          }

          // Calculate new position
          const start = [path[newPathIndex][1], path[newPathIndex][0]];
          const end = [path[newPathIndex + 1][1], path[newPathIndex + 1][0]];
          const newPosition = interpolatePosition(
            start,
            end,
            newSegmentProgress
          );

          return {
            position: newPosition,
            pathIndex: newPathIndex,
            segmentProgress: newSegmentProgress,
          };
        });
      });

      setAnimationProgress((prev) => prev + 0.02);
    }, 50); // Update every 50ms

    return () => clearInterval(animationTimer);
  }, [isVisualizing, vehiclePaths]);

  // Warna untuk setiap vehicle
  const vehicleColors = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  console.log(vehicles);

  // USE EFFECT UNTUK KENDARAAN (FECTH DATA KENDARAAN DI BACKEND)
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehicleData = await axios.get(
          "http://localhost:5000/api/vehicles"
        );
        setVehicles(vehicleData.data);
        console.log("berhasil fetch kendaraan");
      } catch (err) {
        console.error("Error fetching vehicles", err);
      }
    };
    fetchVehicles();
  }, [isUpdatedVehicle]);

  // USE EFFECT UNTUK LOKASI (FECTH DATA LOKASI DI BACKEND)
  useEffect(() => {
    localStorage.setItem("vehicles", JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/locations");
        setLocations(res.data);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    fetchLocations();
  }, [isDeleted]);

  console.log(vehicles);
  const handleUpdateVehicle = async (vehicleData) => {
    try {
      // if (!vehicleData.count || vehicleData.count < 1) {
      //   alert("Jumlah kendaraan minimal 1");
      //   return;
      // }
      const payload = {
        ...vehicleData,
        count: parseInt(vehicleData.count, 10),
      };
      // setVehicleCount(vehicleData.count)
      setIsUpdatedVehicle(!isUpdatedVehicle);
      await api.updateVehicle(payload);
      alert(`Update vehicle ${vehicleData.type} to ${vehicleData.count}`);
    } catch (error) {
      console.error("Error saat update vehicle");
    }
  };

  const handleDeleteVehicle = async (vehicleData) => {
    try {
      if (!confirm("Hapus kendaraan ini?")) return;
      await api.deleteVehicle(vehicleData);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {}
  };

  const handleOpenLocationPicker = () => {
    setShowLocationPicker(true);
  };

  const handleSaveNewLocation = async (newLocation) => {
    try {
      const savedLocation = await api.saveLocation(newLocation);
      setLocations((prev) => [...prev, savedLocation]);
      setShowLocationPicker(false);

      alert(`Location "${newLocation.name}" saved successfully!`);
      window.location.reload();
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Failed to save location. Please try again.");
    }
  };

  const handleDeleteLocation = async (locationData) => {
    try {
      await api.deleteLocation(locationData);
      setIsDeleted(true);
      setDeletedLocation(locationData);
      alert(`Deleted: ${locationData.name}`);
    } catch (error) {
      alert("Failed to delete location. Please try again.");
    }
  };

  const [params, setParams] = useState({
    maxIterations: 500,
    initialTemp: 1000,
    coolingRate: 0.995,
    populationSize: 50,
    generations: 200,
    mutationRate: 0.02,
    tabuTenure: 20,
  });

  const solveRoute = async () => {
    setSolving(true);
    setCurrentIteration(0);
    setFinalRoute(null);
    setIsPlaying(false);
    setError(null);

    try {
      let data;

      // Metaheuristic algorithms
      if (
        [
          "simulated-annealing",
          "genetic",
          "hill-climbing",
          "tabu-search",
        ].includes(algorithm)
      ) {
        if (!locations || locations.length === 0) {
          throw new Error("Locations tidak boleh kosong untuk algoritma ini");
        }
        
        const saParams = {
          initialTemp: params?.initialTemp ?? 1000,
          coolingRate: params?.coolingRate ?? 0.995,
          maxIterations: params?.maxIterations ?? 500,
          populationSize: params?.populationSize ?? 50,
          generations: params?.generations ?? 200,
          mutationRate: params?.mutationRate ?? 0.02,
          tabuTenure: params?.tabuTenure ?? 20,
          carCount: params?.carCount ?? 1,
          motorCount: params?.motorCount ?? 2,
        };

        console.log("Payload:", { locations, params: saParams });

        switch (algorithm) {
          case "simulated-annealing":
            data = await api.solveSimulatedAnnealing(locations, {
              vehicles: vehicles,
              maxIterations: saParams.maxIterations,
              coolingRate: saParams.coolingRate,
              initialTemp: saParams.initialTemp

            });
            break;
          case "genetic":
            data = await api.solveGenetic(locations, {
              vehicles: vehicles,
              populationSize: saParams.populationSize,
              generations: saParams.generations,
              mutationRate: saParams.mutationRate,
            });
            break;
          case "hill-climbing":
            data = await solveHillClimbing(locations, {
              vehicles: vehicles,
              maxIterations: saParams.maxIterations,
            });
            break;
          default:
            throw new Error(`Algorithm "${algorithm}" tidak dikenali`);
        }
      }
      // Graph search algorithms
      else {
        throw new Error(`Algorithm "${algorithm}" tidak dikenali`);
      }

      if (data.finalCost == 0) {
        setError("Capacity kendaraan lebih kecil dari demand yang dibutuhkan");
      }
      // Set hasil ke state
      setHistory(data.history);

      if (data.vehicleRoutes) {
        setVehicleRoutes(data.vehicleRoutes);
        setVehiclePaths(data.vehiclePaths);
        setVehicleTypes(data.vehicleTypes);
        setTotalVehicles(data.totalVehicles);
        setFinalRoute(null); // Clear single route
      }

      setFinalCost(data.finalCost);
    } catch (error) {
      console.error("Error solving route:", error);
      setError("Error Solving Route");
    } finally {
      setSolving(false);
    }
  };

  useEffect(() => {
    if (
      isPlaying &&
      history.length > 0 &&
      currentIteration < history.length - 1
    ) {
      const timer = setTimeout(() => {
        setCurrentIteration((prev) => prev + 1);
      }, playSpeed);
      return () => clearTimeout(timer);
    } else if (currentIteration >= history.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentIteration, history.length, playSpeed]);

  const getCurrentRoute = () => {
    if (history.length === 0) return null;
    const current = history[Math.min(currentIteration, history.length - 1)];
    return current.route.map((idx) => locations[idx]);
  };

  const getRoutePolyline = () => {
    const route = getCurrentRoute();
    if (!route) return [];
    const points = route.map((loc) => [loc.lat, loc.lng]);
    points.push([route[0].lat, route[0].lng]);
    return points;
  };

  const saveNewLocation = () => {
    setLocations((prev) => [
      ...prev,
      {
        lat: tempLocation.lat,
        lng: tempLocation.lng,
        name: newName || "Unnamed",
      },
    ]);

    setTempLocation(null);
    setNewName("");
  };

  const getOSRMPolyline = () => {
    if (!roadPath || roadPath.length === 0) return [];
    // Convert [lng, lat] -> [lat, lng]
    return roadPath.map((coord) => [coord[1], coord[0]]);
  };

  const removeLocation = (index) => {
    if (index === 0) {
      alert("Tidak bisa hapus depot!");
      return;
    }
    setLocations(locations.filter((_, i) => i !== index));
  };

  const currentState = history[Math.min(currentIteration, history.length - 1)];
  const chartData = history.slice(0, currentIteration + 1).map((h) => ({
    iteration: h.iteration,
    cost: h.cost,
    temperature: h.temperature?.toFixed(2) || 0,
  }));

  const algorithmOptions = [
    {
      value: "hill-climbing",
      label: "Hill Climbing",
      color: "from-blue-500 to-cyan-500",
    },
    {
      value: "simulated-annealing",
      label: "Simulated Annealing",
      color: "from-orange-500 to-red-500",
    },
    {
      value: "genetic",
      label: "Genetic Algorithm",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Navbar locations={locations} />

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {/* Control Panel */}
        <AlgorithmPanel
          algorithm={algorithm}
          setAlgorithm={setAlgorithm}
          showParams={showParams}
          setShowParams={setShowParams}
          params={params}
          setParams={setParams}
          solving={solving}
          locations={locations}
          history={history}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentIteration={currentIteration}
          setCurrentIteration={setCurrentIteration}
          playSpeed={playSpeed}
          setPlaySpeed={setPlaySpeed}
          solveRoute={solveRoute}
          algorithmOptions={algorithmOptions}
          vehicleRoutes={vehicleRoutes}
          isVisualizing={isVisualizing}
          startVisualization={startVisualization}
          stopVisualization={stopVisualization}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Location Manager */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-5">
                Manage Locations
              </h3>

              <div className="space-y-4">
                {/* Name Input */}
                <input
                  type="text"
                  placeholder="Location Name"
                  value={newLocation.name}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl
                 focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 outline-none 
                 transition-all shadow-sm"
                />

                {/* Lat - Lng Input */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={newLocation.lat}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, lat: e.target.value })
                    }
                    className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl
                   focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 
                   outline-none transition-all shadow-sm"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={newLocation.lng}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, lng: e.target.value })
                    }
                    className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl
                   focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 
                   outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Add Location Button */}
                <button
                  onClick={handleOpenLocationPicker}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                 bg-green-600 text-white text-sm font-medium rounded-xl 
                 hover:bg-green-700 active:scale-[0.98] transition-all shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add Location</span>
                </button>

                <LocationPickerModal
                  isOpen={showLocationPicker}
                  onClose={() => setShowLocationPicker(false)}
                  onSave={handleSaveNewLocation}
                  initialCenter={[-7.2575, 112.7521]}
                />
              </div>

              {/* Location List */}
              <div className="mt-6 max-h-80 overflow-y-auto space-y-2 pr-1">
                {locations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 
                   bg-gray-50 rounded-xl border border-gray-200
                   hover:bg-gray-100 transition-all shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {loc.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </div>
                    </div>

                    {idx > 0 && (
                      <button
                        onClick={() => handleDeleteLocation(loc)}
                        className="ml-3 text-red-500 hover:text-red-700 
                       p-1 rounded-lg transition-all hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Vehicle */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 transform hover:scale-[1.01] transition-all duration-300">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Car className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Add Vehicle
                  </h3>
                </div>
                <p className="text-gray-500 text-sm ml-15">
                  Manage your fleet vehicles
                </p>
              </div>

              <div className="space-y-4">
                {/* Type Select */}
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-5 py-2 text-base border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 hover:bg-white appearance-none cursor-pointer"
                  >
                    <option value="Mobil">🚗 Mobil</option>
                    <option value="Motor">🏍️ Motor</option>
                  </select>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-focus-within:opacity-10 transition-opacity pointer-events-none" />
                </div>

                {/* Count Input */}
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jumlah Kendaraan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={vehicleCount}
                    onChange={(e) => setVehicleCount(e.target.value)}
                    className="w-full px-5 py-2 text-base border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 hover:bg-white"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-focus-within:opacity-10 transition-opacity pointer-events-none" />
                </div>

                {/* Update Button */}
                <button
                  onClick={() =>
                    handleUpdateVehicle({
                      type: vehicleType,
                      count: vehicleCount,
                    })
                  }
                  className="w-full flex items-center justify-center gap-3 px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-base rounded-2xl hover:from-blue-600 hover:to-indigo-700 transform hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-lg"
                >
                  <Plus size={20} strokeWidth={2.5} />
                  <span>Update Kendaraan</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm font-medium text-gray-500">
                    Current Vehicles
                  </span>
                </div>
              </div>

              {/* Vehicles List */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {vehicles.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Car size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-base font-medium">Belum ada kendaraan</p>
                    <p className="text-sm opacity-75">
                      Tambahkan kendaraan pertama Anda
                    </p>
                  </div>
                )}

                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="group flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border-2 border-transparent hover:border-blue-200 hover:shadow-md transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Vehicle Icon */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                        <Car className="text-white" size={18} />
                      </div>

                      {/* Vehicle Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-gray-900 capitalize truncate group-hover:text-blue-600 transition-colors">
                          {v.type}
                        </div>
                        <div className="text-sm text-gray-500">
                          Jumlah:{" "}
                          <span className="font-semibold text-blue-600">
                            {v.count}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="ml-4 text-gray-400 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-50 transition-all duration-300 opacity-0 group-hover:opacity-100 transform hover:scale-110"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Final Results */}
            {/* Final Results */}

            {(finalRoute || vehicleRoutes.length > 0) && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 p-5">
                <h3 className="text-lg text-gray-900 mb-4">Final Results</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Algorithm</span>
                    <span className="text-sm text-gray-900 capitalize">
                      {algorithm.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Total Distance
                    </span>
                    <span className="text-lg text-blue-600">
                      {(finalCost / 1000).toFixed(2)} km
                    </span>
                  </div>
                  {totalVehicles > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Vehicles Used
                      </span>
                      <span className="text-sm text-gray-900">
                        {totalVehicles} vehicle(s)
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Iterations</span>
                    <span className="text-sm text-gray-900">
                      {history[history.length - 1]?.iteration}
                    </span>
                  </div>

                  {/* Vehicle breakdown untuk genetic algorithm */}
                  {vehicleTypes.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <div className="text-xs text-gray-600 mb-2">
                        Vehicle Routes:
                      </div>
                      {vehicleRoutes.map((route, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1.5 px-2 bg-white rounded-lg mb-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  vehicleColors[idx % vehicleColors.length],
                              }}
                            ></div>
                            <span className="text-xs text-gray-700 capitalize">
                              {vehicleTypes[idx]} {idx + 1}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {route.length - 2} stop(s)
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-sm"
                      >
                        View Schedule
                      </button>
                      {/* Schedule Modal */}
                      <ScheduleModal
                        isOpen={showScheduleModal}
                        onClose={() => setShowScheduleModal(false)}
                        vehicleRoutes={vehicleRoutes}
                        vehicleTypes={vehicleTypes}
                        finalCost={finalCost}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Map Section */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Map Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <h2 className="text-lg">Route Visualization</h2>
                {currentState && (
                  <div className="mt-1 text-sm opacity-90">
                    Iteration: {currentState.iteration} | Cost:{" "}
                    {currentState.cost?.toFixed(4) || "N/A"}
                    {currentState.temperature &&
                      ` | Temp: ${currentState.temperature.toFixed(2)}`}
                  </div>
                )}
              </div>

              {/* Map Container */}
              <div style={{ height: "900px" }}>
                <MapContainer
                  center={[-7.2575, 112.7521]}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                >
                  <MapUpdater center={[-7.2575, 112.7521]} zoom={12} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />

                  {locations.map((loc, idx) => (
                    <Marker
                      key={idx}
                      position={[loc.lat, loc.lng]}
                      icon={idx === 0 ? depotIcon : deliveryIcon}
                    >
                      <Popup>
                        <div>
                          <div className="text-sm text-gray-900">
                            {loc.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {getOSRMPolyline().length > 0 && (
                    <Polyline
                      positions={getOSRMPolyline()}
                      color="#3b82f6"
                      weight={3}
                      opacity={0.8}
                    />
                  )}

                  {/* Multi-vehicle routes untuk genetic algorithm */}
                  {vehiclePaths.length > 0 &&
                    vehiclePaths.map((path, idx) => {
                      if (!path || path.length === 0) return null;

                      // Convert [lng, lat] -> [lat, lng]
                      const positions = path.map((coord) => [
                        coord[1],
                        coord[0],
                      ]);

                      return (
                        <Polyline
                          key={`vehicle-${idx}`}
                          positions={positions}
                          color={vehicleColors[idx % vehicleColors.length]}
                          weight={4}
                          opacity={0.8}
                        />
                      );
                    })}

                  {/* Single vehicle route untuk algorithm lain */}
                  {finalRoute?.length > 0 &&
                    (Array.isArray(finalRoute[0]) ? (
                      finalRoute.map((route, idx) => (
                        <Polyline
                          key={idx}
                          positions={route.map((n) => [n.lat, n.lng])}
                          color="#f59e0b"
                          weight={3}
                          opacity={0.8}
                        />
                      ))
                    ) : (
                      <Polyline
                        positions={finalRoute.map((n) => [n.lat, n.lng])}
                        color="#f59e0b"
                        weight={3}
                        opacity={0.8}
                      />
                    ))}

                  {/* Animated vehicle markers */}
                  {isVisualizing &&
                    vehiclePositions.map((vPos, idx) => (
                      <Marker
                        key={`vehicle-${idx}`}
                        position={vPos.position}
                        icon={
                          vehicleTypes[idx] === "Mobil"
                            ? carAnimIcon
                            : motorAnimIcon
                        }
                        zIndexOffset={1000}
                      >
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold capitalize">
                              {vehicleTypes[idx]} {idx + 1}
                            </div>
                            <div className="text-xs text-gray-500">
                              En route...
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>
              {chartData.length > 0 && (
                <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-lg text-gray-900 mb-4">
                    Optimization Progress
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="iteration"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      {algorithm === "simulated-annealing" && (
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="cost"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="Cost"
                      />
                      {algorithm === "simulated-annealing" && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="temperature"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          name="Temperature"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
