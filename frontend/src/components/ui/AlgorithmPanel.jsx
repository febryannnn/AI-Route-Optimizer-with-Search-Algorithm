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
  generateRandomLocations,
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {algorithmOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setAlgorithm(option.value)}
              className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                algorithm === option.value
                  ? option.value === "hill-climbing"
                    ? "border-blue-200 bg-gradient-to-br from-blue-50 via-blue-100/30 to-indigo-100/40 shadow-lg shadow-blue-100/50"
                    : option.value === "simulated-annealing"
                    ? "border-orange-200 bg-gradient-to-br from-orange-50 via-orange-100/30 to-red-100/40 shadow-lg shadow-orange-100/50"
                    : "border-green-200 bg-gradient-to-br from-green-50 via-green-100/30 to-emerald-100/40 shadow-lg shadow-green-100/50"
                  : "border-gray-200 hover:border-gray-300 bg-white shadow-sm hover:shadow-md"
              }`}
            >
              {/* Gradient overlay on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${option.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              ></div>

              {/* Accent bar - lebih tebal dan lebih visible */}
              <div
                className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                  option.color
                } transform transition-all duration-300 ${
                  algorithm === option.value
                    ? "scale-x-100 opacity-80"
                    : "scale-x-0 group-hover:scale-x-100 group-hover:opacity-60"
                }`}
              ></div>

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-r ${
                      option.color
                    } flex items-center justify-center shadow-md transition-all duration-300 ${
                      algorithm === option.value
                        ? "shadow-lg scale-110"
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

                  {algorithm === option.value && (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center animate-pulse ${
                        option.value === "hill-climbing"
                          ? "bg-blue-500 shadow-lg shadow-blue-300"
                          : option.value === "simulated-annealing"
                          ? "bg-orange-500 shadow-lg shadow-orange-300"
                          : "bg-green-500 shadow-lg shadow-green-300"
                      }`}
                    >
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>

                <div className="text-left">
                  <div
                    className={`text-sm font-semibold mb-1 transition-colors duration-300 ${
                      algorithm === option.value
                        ? option.value === "hill-climbing"
                          ? "text-blue-700"
                          : option.value === "simulated-annealing"
                          ? "text-orange-700"
                          : "text-green-700"
                        : "text-gray-900"
                    }`}
                  >
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.value === "hill-climbing" &&
                      "Fast local optimization"}
                    {option.value === "simulated-annealing" &&
                      "Temperature-based search"}
                    {option.value === "genetic" &&
                      "Evolution-inspired approach"}
                  </div>
                </div>
              </div>

              {/* Corner decoration when selected */}
              {algorithm === option.value && (
                <div
                  className={`absolute bottom-0 right-0 w-16 h-16 rounded-tl-full ${
                    option.value === "hill-climbing"
                      ? "bg-gradient-to-tl from-blue-200/30 to-transparent"
                      : option.value === "simulated-annealing"
                      ? "bg-gradient-to-tl from-orange-200/30 to-transparent"
                      : "bg-gradient-to-tl from-green-200/30 to-transparent"
                  }`}
                ></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ====== PARAMETER TOGGLE ====== */}
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

      {/* ====== PARAMETERS ====== */}
      {showParams && (
        <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-inner animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-semibold text-gray-800">
              Algorithm Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Hill Climbing + SA */}
            {algorithm !== "genetic" && (
              <div className="group">
                <label className="block text-xs font-medium text-gray-600 mb-2">
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
                  className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            {/* Simulated Annealing */}
            {algorithm === "simulated-annealing" && (
              <>
                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
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
                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
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
                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>
              </>
            )}

            {/* Genetic Algorithm */}
            {algorithm === "genetic" && (
              <>
                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
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
                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
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
                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
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
                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ====== ACTION BUTTONS ====== */}
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

        {/* Random Button if no history */}
        {!history.length && (
          <button
            onClick={generateRandomLocations}
            className="ml-auto px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:scale-105 hover:shadow-lg hover:shadow-purple-300/50 transition-all duration-300 font-medium"
          >
            Random Locations
          </button>
        )}
      </div>
    </div>
  );
}
