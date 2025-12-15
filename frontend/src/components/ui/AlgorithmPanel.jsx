// src/components/AlgorithmPanel.jsx
import { Zap, Play, Pause, RotateCcw, Settings } from "lucide-react";

export default function AlgorithmPanel({
  algorithm,
  setAlgorithm,
  showParams,
  setShowParams,
  params,
  setParams,
  solving,
  locations,
  history,
  isPlaying,
  setIsPlaying,
  currentIteration,
  setCurrentIteration,
  playSpeed,
  setPlaySpeed,
  solveRoute,
  algorithmOptions,
  vehicleRoutes,
  isVisualizing,
  startVisualization,
  stopVisualization,
}) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg border border-gray-200 p-8 mb-6 backdrop-blur-sm">
      
      {/* ====== ALGORITHM SELECTION ====== */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
          <label className="text-base font-semibold text-gray-800">
            Choose Your Algorithm
          </label>
        </div>

        {/* LAYOUT: Vertical Stack (Ke Bawah) */}
        <div className="flex flex-col gap-3">
          {algorithmOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setAlgorithm(option.value)}
              className={`group relative overflow-hidden w-full p-4 rounded-xl border-2 transition-all duration-300 transform hover:shadow-lg ${
                algorithm === option.value
                  ? option.value === "tabu-search" // <--- GANTI JADI TABU SEARCH
                    ? "border-purple-400 bg-gradient-to-r from-purple-50 to-purple-100/50 shadow-md shadow-purple-200/60 scale-[1.01]"
                    : option.value === "simulated-annealing"
                    ? "border-orange-400 bg-gradient-to-r from-orange-50 to-orange-100/50 shadow-md shadow-orange-200/60 scale-[1.01]"
                    : "border-green-400 bg-gradient-to-r from-green-50 to-green-100/50 shadow-md shadow-green-200/60 scale-[1.01]"
                  : "border-gray-200 hover:border-gray-300 bg-white shadow-sm hover:scale-[1.01]"
              }`}
            >
              {/* Gradient overlay on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${option.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              ></div>

              {/* Accent bar (Kiri) */}
              <div
                className={`absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b ${
                  option.color
                } transform transition-all duration-300 ${
                  algorithm === option.value
                    ? "scale-y-100 opacity-100"
                    : "scale-y-0 group-hover:scale-y-100 group-hover:opacity-80"
                }`}
              ></div>

              {/* Content Container */}
              <div className="relative z-10 flex items-center w-full pl-2">
                
                {/* 1. ICON */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${
                    option.color
                  } flex items-center justify-center shadow-md transition-all duration-300 mr-4 ${
                    algorithm === option.value
                      ? "shadow-lg scale-110 ring-2 ring-white"
                      : "group-hover:scale-105"
                  }`}
                >
                  <Zap
                    size={20}
                    className={`text-white transition-transform duration-300 ${
                      algorithm === option.value ? "animate-pulse" : ""
                    }`}
                  />
                </div>

                {/* 2. TEKS (JUDUL & DESKRIPSI) */}
                <div className="text-left flex-1 min-w-0">
                  <div
                    className={`text-sm font-bold transition-colors duration-300 ${
                      algorithm === option.value
                        ? option.value === "tabu-search" // <--- TEXT COLOR PURPLE
                          ? "text-purple-800"
                          : option.value === "simulated-annealing"
                          ? "text-orange-800"
                          : "text-green-800"
                        : "text-gray-900"
                    }`}
                  >
                    {option.label}
                  </div>
                  <div
                    className={`text-xs font-medium truncate ${
                      algorithm === option.value
                        ? option.value === "tabu-search"
                          ? "text-purple-600"
                          : option.value === "simulated-annealing"
                          ? "text-orange-600"
                          : "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {/* <--- DESKRIPSI DIPERBAIKI DISINI */}
                    {option.value === "tabu-search" && "Local search method for optimization"}
                    {option.value === "simulated-annealing" && "Temperature-based search"}
                    {option.value === "genetic" && "Evolution-inspired approach"}
                  </div>
                </div>

                {/* 3. INDIKATOR AKTIF */}
                {algorithm === option.value && (
                  <div className="ml-3 flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center animate-pulse ${
                        option.value === "tabu-search"
                          ? "bg-purple-100 text-purple-600"
                          : option.value === "simulated-annealing"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full currentColor bg-current`}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Decoration */}
              {algorithm === option.value && (
                <div
                  className={`absolute bottom-0 right-0 w-32 h-32 rounded-tl-full opacity-10 pointer-events-none ${
                    option.value === "tabu-search"
                      ? "bg-purple-500"
                      : option.value === "simulated-annealing"
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                ></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ====== PARAMETER TOGGLE (TIDAK BERUBAH) ====== */}
      <button
        onClick={() => setShowParams(!showParams)}
        className="group flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl mb-6 transition-all duration-300 shadow-sm hover:shadow-md"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-300">
          <Settings
            size={16}
            className="text-blue-600 group-hover:text-white transition-colors duration-300"
          />
        </div>
        <span>{showParams ? "Hide" : "Show"} Advanced Parameters</span>
        <div
          className={`ml-auto transform transition-transform duration-300 ${
            showParams ? "rotate-180" : ""
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* ====== PARAMETERS (SESUAIKAN LOGIKA TABU) ====== */}
      {/* ====== PARAMETERS ====== */}
      {showParams && (
        <div className="mb-8 p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-gray-200 shadow-inner animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-semibold text-gray-800">
              Algorithm Parameters
            </h3>
          </div>

          {/* PERBAIKAN DISINI: Gunakan grid-cols-1 (1 kolom) agar rapi di sidebar */}
          <div className="grid grid-cols-1 gap-3">
            
            {/* Tabu Search + SA (Shared param: Iterations) */}
            {algorithm !== "genetic" && (
              <div className="group">
                <label className="block text-xs font-medium text-gray-600 mb-1">
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
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            {/* Tabu Search Specific Params */}
            {algorithm === "tabu-search" && (
             <div className="group">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tabu List Size
                </label>
                <input
                  type="number"
                  value={params.tabuListSize || 10}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      tabuListSize: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
              </div>
            )}

            {/* Simulated Annealing */}
            {algorithm === "simulated-annealing" && (
              <>
                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Initial Temp
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
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
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
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>
              </>
            )}

            {/* Genetic Algorithm */}
            {algorithm === "genetic" && (
              <>
                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
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
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
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
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Mutation Rate
                  </label>
                  <input
                    type="number"
                    value={params.mutationRate}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        mutationRate: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ====== ACTION BUTTONS (TIDAK BERUBAH) ====== */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={solveRoute}
          disabled={solving || locations.length < 3}
          className="group relative overflow-hidden flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:scale-105 hover:shadow-lg hover:shadow-blue-300/50 disabled:opacity-60 disabled:hover:scale-100 transition-all duration-300"
        >
          <Zap size={20} className={solving ? "animate-spin" : ""} />
          <span className="font-medium">
            {solving ? "Processing..." : "Optimize Route"}
          </span>
        </button>

        {vehicleRoutes.length > 0 && (
          <button
            onClick={isVisualizing ? stopVisualization : startVisualization}
            className={`px-6 py-3.5 rounded-xl font-medium transition-all duration-300 ${
              isVisualizing
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-300/50 hover:scale-105"
                : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-300/50 hover:scale-105"
            }`}
          >
            {isVisualizing ? "Stop Visualization" : "🚗 Visualize Route"}
          </button>
        )}

        {/* Controls when history exists */}
        {history.length > 0 && (
          <>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="group relative overflow-hidden flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 hover:shadow-lg hover:shadow-green-300/50 transition-all duration-300"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              <span className="font-medium">
                {isPlaying ? "Pause" : "Play"}
              </span>
            </button>

            <button
              onClick={() => setCurrentIteration(0)}
              className="group relative flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:scale-105 hover:shadow-lg hover:shadow-gray-400/50 transition-all duration-300"
            >
              <RotateCcw size={20} />
              <span className="font-medium">Reset</span>
            </button>

            <div className="flex items-center gap-4 ml-auto px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
              <label className="text-xs font-medium text-gray-600">
                Speed:
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={playSpeed}
                onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
                className="w-32 h-2 bg-gray-200 rounded-lg accent-blue-600"
              />
              <span className="text-xs font-semibold text-gray-900 w-16 text-right">
                {playSpeed}ms
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}