import React, { useState, useEffect } from "react";
import api from "./services/api";
import axios from "axios";
import Navbar from "./components/ui/Navbar";
import LocationManager from "./components/ui/LocationManager";
import FleetManager from "./components/ui/FleetManager";
import AlgorithmControl from "./components/ui/AlgorithmControl";
import MapVisualization from "./components/ui/MapVisualization";
import OptimizationChart from "./components/ui/OptimizationChart";
import ResultsPanel from "./components/ui/ResultsPanel";
import ErrorPopup from "./components/ui/ErrorPopup";
import LocationPickerModal from "./components/ui/LocationPickerModal";
import ScheduleModal from "./components/ui/ScheduleModal";

function App() {
  // Location State
  const [locations, setLocations] = useState([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Vehicle State
  const [vehicles, setVehicles] = useState([]);
  const [isUpdatedVehicle, setIsUpdatedVehicle] = useState(false);

  // Algorithm State
  const [algorithm, setAlgorithm] = useState("tabu-search");
  const [solving, setSolving] = useState(false);
  const [params, setParams] = useState({
    maxIterations: 500,
    initialTemp: 1000,
    coolingRate: 0.995,
    populationSize: 50,
    generations: 200,
    mutationRate: 0.02,
    tabuTenure: 20,
  });
  const [showParams, setShowParams] = useState(false);

  // Results State
  const [currentIteration, setCurrentIteration] = useState(0);
  const [history, setHistory] = useState([]);
  const [finalRoute, setFinalRoute] = useState(null);
  const [finalCost, setFinalCost] = useState(null);
  const [vehicleRoutes, setVehicleRoutes] = useState([]);
  const [vehiclePaths, setVehiclePaths] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [totalVehicles, setTotalVehicles] = useState(0);

  // Animation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(200);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [vehiclePositions, setVehiclePositions] = useState([]);
  const [animationProgress, setAnimationProgress] = useState(0);

  // UI State
  const [error, setError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [errorPopup, setErrorPopup] = useState({
    show: false,
    message: "",
    type: "error",
  });

  const showErrorPopup = (message, type = "error") => {
    setErrorPopup({ show: true, message, type });
    setTimeout(() => {
      setErrorPopup({ show: false, message: "", type: "error" });
    }, 4000);
  };

  // Fetch Vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehicleData = await axios.get(
          "http://localhost:5000/api/vehicles"
        );
        setVehicles(vehicleData.data);
      } catch (err) {
        console.error("Error fetching vehicles", err);
      }
    };
    fetchVehicles();
  }, [isUpdatedVehicle]);

  // Fetch Locations
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

  // Save vehicles to localStorage
  useEffect(() => {
    localStorage.setItem("vehicles", JSON.stringify(vehicles));
  }, [vehicles]);

  // Animation Effect
  useEffect(() => {
    if (!isVisualizing || vehiclePaths.length === 0) return;

    const animationTimer = setInterval(() => {
      setVehiclePositions((prevPositions) => {
        return prevPositions.map((vPos, vIdx) => {
          const path = vehiclePaths[vIdx];
          if (!path || vPos.pathIndex >= path.length - 1) return vPos;

          let newSegmentProgress = vPos.segmentProgress + 0.5;
          let newPathIndex = vPos.pathIndex;

          if (newSegmentProgress >= 1) {
            newSegmentProgress = 0;
            newPathIndex++;
          }

          if (newPathIndex >= path.length - 1) {
            return { ...vPos, pathIndex: path.length - 1, segmentProgress: 1 };
          }

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
    }, 50);

    return () => clearInterval(animationTimer);
  }, [isVisualizing, vehiclePaths]);

  // Playback Effect
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

    const initialPositions = vehiclePaths.map((path) => ({
      position: [path[0][1], path[0][0]],
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

  const handleUpdateVehicle = async (vehicleData) => {
    try {
      const payload = {
        ...vehicleData,
        count: parseInt(vehicleData.count, 10),
      };
      setIsUpdatedVehicle(!isUpdatedVehicle);
      await api.updateVehicle(payload);
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
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleData.id));
    } catch (error) {
      console.error("Error deleting vehicle");
    }
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
      alert(`Deleted: ${locationData.name}`);
    } catch (error) {
      alert("Failed to delete location. Please try again.");
    }
  };

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
        "error"
      );
      setSolving(false);
      return;
    }

    try {
      let data;

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
        };

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
      } else {
        throw new Error(`Algorithm "${algorithm}" tidak dikenali`);
      }

      if (data.finalCost == 0) {
        setError("Capacity kendaraan lebih kecil dari demand yang dibutuhkan");
      }

      setHistory(data.history);

      if (data.vehicleRoutes) {
        setVehicleRoutes(data.vehicleRoutes);
        setVehiclePaths(data.vehiclePaths);
        setVehicleTypes(data.vehicleTypes);
        setTotalVehicles(data.totalVehicles);
        setFinalRoute(null);
      }

      setFinalCost(data.finalCost);
    } catch (error) {
      console.error("Error solving route:", error);
      setError("Error Solving Route");
    } finally {
      setSolving(false);
    }
  };

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

  const currentState = history[Math.min(currentIteration, history.length - 1)];
  const chartData = history.slice(0, currentIteration + 1).map((h) => ({
    iteration: h.iteration,
    cost: h.cost,
    temperature: h.temperature?.toFixed(2) || 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800">
      <ErrorPopup errorPopup={errorPopup} setErrorPopup={setErrorPopup} />

      <Navbar locations={locations} />

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 sm:p-6 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r shadow-sm flex items-center animate-pulse">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        {/* SECTION 1: INPUT DATA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LocationManager
            locations={locations}
            onDeleteLocation={handleDeleteLocation}
            onOpenLocationPicker={() => setShowLocationPicker(true)}
          />

          <FleetManager
            vehicles={vehicles}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
          />
        </div>

        {/* SECTION 2: ALGORITHM & MAP */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          <AlgorithmControl
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

          <MapVisualization
            locations={locations}
            vehiclePaths={vehiclePaths}
            vehicleTypes={vehicleTypes}
            isVisualizing={isVisualizing}
            vehiclePositions={vehiclePositions}
            currentState={currentState}
          />
        </div>

        {/* SECTION 3: PROGRESS & RESULTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[400px]">
          <OptimizationChart chartData={chartData} />

          <ResultsPanel
            finalCost={finalCost}
            vehicleRoutes={vehicleRoutes}
            vehicleTypes={vehicleTypes}
            totalVehicles={totalVehicles}
            algorithm={algorithm}
            onOpenSchedule={() => setShowScheduleModal(true)}
          />
        </div>
      </main>

      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSave={handleSaveNewLocation}
        initialCenter={[-7.2575, 112.7521]}
      />

      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        vehicleRoutes={vehicleRoutes}
        vehicleTypes={vehicleTypes}
        finalCost={finalCost}
      />
    </div>
  );
}

export default App;
