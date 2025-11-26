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
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "./services/api";

// Fix Leaflet default icon issue
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

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function App() {
  const [locations, setLocations] = useState([
    { lat: -7.2575, lng: 112.7521, name: "Depot (Surabaya)" },
    { lat: -7.2655, lng: 112.7428, name: "Tunjungan Plaza" },
    { lat: -7.2695, lng: 112.7515, name: "Pasar Atom" },
    { lat: -7.2804, lng: 112.7688, name: "ITS Sukolilo" },
    { lat: -7.2889, lng: 112.7806, name: "Kenjeran" },
    { lat: -7.3136, lng: 112.7283, name: "Waru" },
    { lat: -7.2461, lng: 112.7379, name: "Gubeng" },
    { lat: -7.2954, lng: 112.7376, name: "Rungkut" },
    { lat: -7.2494, lng: 112.7623, name: "Wonokromo" },
    { lat: -7.2761, lng: 112.7943, name: "Sukolilo" },
  ]);

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

        // Pastikan params ada dan beri default jika tidak
        const saParams = {
          initialTemp: params?.initialTemp ?? 1000,
          coolingRate: params?.coolingRate ?? 0.995,
          maxIterations: params?.maxIterations ?? 500,
          populationSize: params?.populationSize ?? 50,
          generations: params?.generations ?? 200,
          mutationRate: params?.mutationRate ?? 0.02,
          tabuTenure: params?.tabuTenure ?? 20,
        };

        console.log("Payload:", { locations, params: saParams });

        switch (algorithm) {
          case "simulated-annealing":
            data = await api.solveSimulatedAnnealing(locations, saParams);
            break;
          case "genetic":
            data = await api.solveGenetic(locations, saParams);
            break;
          case "hill-climbing":
            data = await api.solveHillClimbing(
              locations,
              saParams.maxIterations
            );
            break;
          case "tabu-search":
            data = await api.solveTabuSearch(locations, saParams);
            break;
          default:
            throw new Error(`Algorithm "${algorithm}" tidak dikenali`);
        }
      }
      // Graph search algorithms
      else if (["dfs", "bfs", "ucs", "astar", "ids"].includes(algorithm)) {
        const graphData = JSON.parse(graphInput);
        const astarCoords = coordsInput ? JSON.parse(coordsInput) : undefined;

        switch (algorithm) {
          case "dfs":
            data = await api.solveDFS(graphData, startNode, goalNode);
            break;
          case "bfs":
            data = await api.solveBFS(graphData, startNode, goalNode);
            break;
          case "ucs":
            data = await api.solveUCS(graphData, startNode, goalNode);
            break;
          case "astar":
            data = await api.solveAStar(
              graphData,
              astarCoords,
              startNode,
              goalNode
            );
            break;
          case "ids":
            data = await api.solveIDS(graphData, startNode, goalNode);
            break;
          default:
            throw new Error(`Algorithm "${algorithm}" tidak dikenali`);
        }
      } else {
        throw new Error(`Algorithm "${algorithm}" tidak dikenali`);
      }

      // Set hasil ke state
      setHistory(data.history);
      setFinalRoute(data.finalRoute);
      setRoadPath(data.path || []);
    } catch (error) {
      console.error("Error solving route:", error);
      setError("Error: Pastikan input benar dan backend berjalan di port 5000");
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

  const addLocation = () => {
    if (newLocation.lat && newLocation.lng && newLocation.name) {
      setLocations([
        ...locations,
        {
          lat: parseFloat(newLocation.lat),
          lng: parseFloat(newLocation.lng),
          name: newLocation.name,
        },
      ]);
      setNewLocation({ lat: "", lng: "", name: "" });
    }
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

  const generateRandomLocations = () => {
    const count = 5;
    const center = { lat: -7.2575, lng: 112.7521 };
    const radius = 0.1;

    const random = [];
    random.push(locations[0]);

    for (let i = 1; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const r = Math.random() * radius;
      random.push({
        lat: center.lat + r * Math.cos(angle),
        lng: center.lng + r * Math.sin(angle),
        name: `Lokasi ${i}`,
      });
    }
    setLocations(random);
  };

  const currentState = history[Math.min(currentIteration, history.length - 1)];
  const chartData = history.slice(0, currentIteration + 1).map((h) => ({
    iteration: h.iteration,
    cost: h.cost?.toFixed(4) || 0,
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
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <MapPin className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl text-gray-900">AI Route Optimizer</h1>
                <p className="text-sm text-gray-500">
                  Traveling Salesman Problem Solver
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-gray-500">Total Locations</div>
                <div className="text-2xl text-blue-600">{locations.length}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {/* Control Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          {/* Algorithm Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-700 mb-3">
              Select Algorithm
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {algorithmOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAlgorithm(option.value)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    algorithm === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r ${option.color}`}
                  ></div>
                  <div className="text-center mt-2">
                    <div className="text-sm text-gray-900">{option.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters Toggle */}
          <button
            onClick={() => setShowParams(!showParams)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <Settings size={16} />
            <span>{showParams ? "Hide" : "Show"} Parameters</span>
          </button>

          {/* Parameters */}
          {showParams && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">
                  Max Iterations
                </label>
                <input
                  type="number"
                  value={params.maxIterations}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      maxIterations: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              {algorithm === "simulated-annealing" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      Initial Temperature
                    </label>
                    <input
                      type="number"
                      value={params.initialTemp}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          initialTemp: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      Cooling Rate
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={params.coolingRate}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          coolingRate: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}
              {algorithm === "genetic" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      Population Size
                    </label>
                    <input
                      type="number"
                      value={params.populationSize}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          populationSize: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      Generations
                    </label>
                    <input
                      type="number"
                      value={params.generations}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          generations: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}
              {algorithm === "tabu-search" && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">
                    Tabu Tenure
                  </label>
                  <input
                    type="number"
                    value={params.tabuTenure}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        tabuTenure: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={solveRoute}
              disabled={solving || locations.length < 3}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Zap size={18} />
              <span>{solving ? "Processing..." : "Optimize Route"}</span>
            </button>

            {history.length > 0 && (
              <>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  onClick={() => setCurrentIteration(0)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors shadow-sm"
                >
                  <RotateCcw size={18} />
                  <span>Reset</span>
                </button>

                <div className="flex items-center gap-3 ml-auto">
                  <label className="text-xs text-gray-600">Speed:</label>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={playSpeed}
                    onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-xs text-gray-600 w-14">
                    {playSpeed}ms
                  </span>
                </div>
              </>
            )}

            {!history.length && (
              <button
                onClick={generateRandomLocations}
                className="ml-auto px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
              >
                Random Locations
              </button>
            )}
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Location Manager */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-lg text-gray-900 mb-4">Manage Locations</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Location Name"
                  value={newLocation.name}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={newLocation.lat}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, lat: e.target.value })
                    }
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={newLocation.lng}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, lng: e.target.value })
                    }
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={addLocation}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Location</span>
                </button>
              </div>

              {/* Location List */}
              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {locations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">
                        {loc.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </div>
                    </div>
                    {idx > 0 && (
                      <button
                        onClick={() => removeLocation(idx)}
                        className="ml-2 text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Final Results */}
            {finalRoute && (
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
                      {history[history.length - 1]?.cost.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Iterations</span>
                    <span className="text-sm text-gray-900">
                      {history[history.length - 1]?.iteration}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-lg text-gray-900 mb-4">
                  Optimization Progress
                </h3>
                <ResponsiveContainer width="100%" height={220}>
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
              <div style={{ height: "700px" }}>
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
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
