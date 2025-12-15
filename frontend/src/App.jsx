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
  ReceiptRussianRuble,
  Calendar
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "./services/api";
import axios from "axios";
import LocationPickerModal from "./components/ui/LocationPickerModal";
import ScheduleModal from "./components/ui/ScheduleModal";
import AlgorithmPanel from "./components/ui/AlgorithmPanel";
import Navbar from "./components/ui/Navbar";
import { set } from "react-hook-form";

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
  const [algorithm, setAlgorithm] = useState("tabu-search");
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
  const [errorPopup, setErrorPopup] = useState({
    show: false,
    message: "",
    type: "error", // "error", "warning", "success"
  });

  const showErrorPopup = (message, type = "error") => {
    setErrorPopup({ show: true, message, type });
    setTimeout(() => {
      setErrorPopup({ show: false, message: "", type: "error" });
    }, 4000);
  };

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
      // alert(`Update vehicle ${vehicleData.type} to ${vehicleData.count}`);
          showErrorPopup(
            `Vehicle ${vehicleData.type} berhasil diupdate menjadi ${vehicleData.count} unit`,
            "success"
          );
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

    const checkIsValid = (vehicles, locations) => {
      let totalCapacity = 0;
      let maxDemand = 0;
      const motorCapacity =
        vehicles.find((v) => v.type === "Motor")?.capacity || 0;

      for (const v of vehicles) {
        totalCapacity += v.capacity * v.count;
      }

      let totalDemand = 0;

      for (const loc of locations) {
        totalDemand += loc.demand || 0;
        maxDemand = Math.max(maxDemand, loc.demand || 0);
      }
      console.log("Total Capacity:", totalCapacity);
      console.log("Total Demand:", totalDemand);
      console.log("Max Demand:", maxDemand);
      if (totalDemand > totalCapacity || motorCapacity < maxDemand) {
        return false;
      }
      return true;
    };

  const solveRoute = async () => {
    setSolving(true);
    setCurrentIteration(0);
    setFinalRoute(null);
    setIsPlaying(false);
    setError(null);

    if (!checkIsValid(vehicles, locations)) {
      setError("Total capacity kendaraan lebih kecil dari demand customer");
      showErrorPopup(
        "Total capacity kendaraan lebih kecil dari demand customer",
        "error");
      setSolving(false);
      return;
    }

    console.log("lolos")

    try {
      let data;

      // Metaheuristic algorithms
      if (
        ["simulated-annealing", "genetic", "tabu-search"].includes(algorithm)
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
              initialTemp: saParams.initialTemp,
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
          case "tabu-search":
            data = await api.solveTabuSearch(locations, {
              vehicles: vehicles,
              maxIterations: saParams.maxIterations,
              tabuTenure: saParams.tabuTenure,
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
      value: "tabu-search",
      label: "Tabu Search",
      color: "from-purple-500 to-indigo-500",
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

  // console.log(locations)

  const iterationVisualization =
    chartData.length > 0 && vehicleRoutes.length > 0
      ? vehicleRoutes.map((route, vIdx) => {
          const color = vehicleColors[vIdx % vehicleColors.length];
          return {
            label: `${vehicleTypes[vIdx] || "Vehicle"} ${vIdx + 1}`,
            color,
            route,
          };
        })
      : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800">
      {errorPopup.show && (
        <div className="fixed top-6 right-6 z-[9999] animate-slideIn">
          <div
            className={`
        min-w-[320px] max-w-md p-4 rounded-xl shadow-2xl border-l-4 
        backdrop-blur-sm transform transition-all duration-300
        ${
          errorPopup.type === "error"
            ? "bg-red-50/95 border-red-500 text-red-800"
            : errorPopup.type === "warning"
            ? "bg-amber-50/95 border-amber-500 text-amber-800"
            : "bg-green-50/95 border-green-500 text-green-800"
        }
      `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {errorPopup.type === "error" && (
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                )}
                {errorPopup.type === "warning" && (
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-sm">⚠</span>
                  </div>
                )}
                {errorPopup.type === "success" && (
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">✓</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-relaxed">
                  {errorPopup.message}
                </p>
              </div>
              <button
                onClick={() =>
                  setErrorPopup({ show: false, message: "", type: "error" })
                }
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <Navbar locations={locations} />

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 sm:p-6 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r shadow-sm flex items-center animate-pulse">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        {/* =========================================
            SECTION 1: INPUT DATA (Locations & Fleet)
            Posisi: Paling Atas
           ========================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* A. MANAGE LOCATIONS */}
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
                      onClick={() => handleDeleteLocation(loc)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleOpenLocationPicker}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add New Location
            </button>
            <LocationPickerModal
              isOpen={showLocationPicker}
              onClose={() => setShowLocationPicker(false)}
              onSave={handleSaveNewLocation}
              initialCenter={[-7.2575, 112.7521]}
            />
          </div>

          {/* B. MANAGE VEHICLES */}
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
                onClick={() =>
                  handleUpdateVehicle({
                    type: vehicleType,
                    count: vehicleCount,
                  })
                }
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
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteVehicle(v.id)}
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
        </div>

        {/* =========================================
            SECTION 2: ALGORITHM & MAP (Bersebelahan)
            Posisi: Tengah
           ========================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          {/* A. ALGORITHM CONTROL (Kiri - Lebar 4 Kolom) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Algorithm Config
              </h3>

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
            </div>
          </div>

          {/* B. MAP VISUALIZATION (Kanan - Lebar 8 Kolom) */}
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
                      const positions = path.map((coord) => [
                        coord[1],
                        coord[0],
                      ]);
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
                          vehicleTypes[idx] === "Mobil"
                            ? carAnimIcon
                            : motorAnimIcon
                        }
                        zIndexOffset={1000}
                      />
                    ))}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            SECTION 3: PROGRESS OPTIMIZATION
            Posisi: Paling Bawah
           ========================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[400px]">
          {/* CHART (Kiri - Lebar 8 Kolom) */}
          <div className="lg:col-span-8 h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-full flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap size={20} className="text-amber-500" />
                Optimization Progress
              </h3>
              <div className="flex-1 w-full min-h-0">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f0f0f0"
                      />
                      <XAxis dataKey="iteration" hide />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Play size={32} className="mb-2 opacity-50" />
                    <span className="text-sm">Run algorithm to see chart</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STATS / FINAL RESULT (Kanan - Lebar 4 Kolom) */}
          {/* STATS / FINAL RESULT (Kanan - Lebar 4 Kolom) */}
          <div className="lg:col-span-4 h-full flex flex-col gap-6">
            {finalCost !== null && vehicleRoutes.length > 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <Settings size={18} className="text-blue-600" />
                    Final Results
                  </h4>
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                    {algorithm === "tabu-search"
                      ? "Tabu Search"
                      : algorithm === "simulated-annealing"
                      ? "Simulated Annealing"
                      : "Genetic Algorithm"}
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
                      <span className="text-base font-normal text-gray-500">
                        km
                      </span>
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
                      <span className="text-base font-normal text-gray-500">
                        Units
                      </span>
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
                        const totalStops = route.length - 2; // Exclude depot start and end
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
                                <div className="text-gray-500 mb-0.5">
                                  Stops
                                </div>
                                <div className="font-bold text-gray-900">
                                  {totalStops}
                                </div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2">
                                <div className="text-gray-500 mb-0.5">
                                  Distance
                                </div>
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
                  onClick={() => setShowScheduleModal(true)}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Calendar size={18} />
                  View Detailed Schedule
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-full flex flex-col items-center justify-center text-center text-gray-400">
                <Settings size={40} className="mb-3 opacity-20" />
                <p>
                  Results will appear here
                  <br />
                  after optimization
                </p>
              </div>
            )}
          </div>

          {/* Schedule Modal */}
          <ScheduleModal
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            vehicleRoutes={vehicleRoutes}
            vehicleTypes={vehicleTypes}
            finalCost={finalCost}
          />
        </div>
      </main>
    </div>
  );
}
export default App;
