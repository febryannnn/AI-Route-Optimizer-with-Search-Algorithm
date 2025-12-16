import { Zap, Play, Pause, RotateCcw, Settings, Eye, EyeOff } from "lucide-react";

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
  const hasResults = history.length > 0;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg border border-gray-200 p-6 mb-6 backdrop-blur-sm">
      
      {/* ====== ALGORITHM SELECTION ====== */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
          <label className="text-base font-semibold text-gray-800">
            Choose Your Algorithm
          </label>
        </div>

        <div className="flex flex-col gap-3">
          {algorithmOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setAlgorithm(option.value)}
              className={`group relative overflow-hidden w-full p-4 rounded-xl border-2 transition-all duration-300 transform ${
                algorithm === option.value
                  ? option.value === "tabu-search"
                    ? "border-purple-400 bg-purple-50 shadow-md scale-[1.01]"
                    : option.value === "simulated-annealing"
                    ? "border-orange-400 bg-orange-50 shadow-md scale-[1.01]"
                    : "border-green-400 bg-green-50 shadow-md scale-[1.01]"
                  : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="relative z-10 flex items-center w-full pl-2">
                {/* ICON */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${
                    option.color
                  } flex items-center justify-center shadow-md mr-4 text-white`}
                >
                  <Zap size={20} className={algorithm === option.value ? "animate-pulse" : ""} />
                </div>

                {/* TEKS */}
                <div className="text-left flex-1 min-w-0">
                  <div className={`text-sm font-bold ${
                      algorithm === option.value ? "text-gray-900" : "text-gray-600"
                    }`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {option.value === "tabu-search" && "Local search method for optimization"}
                    {option.value === "simulated-annealing" && "Temperature-based search"}
                    {option.value === "genetic" && "Evolution-inspired approach"}
                  </div>
                </div>

                {/* INDIKATOR AKTIF */}
                {algorithm === option.value && (
                  <div className="ml-3 flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ====== PARAMETER TOGGLE ====== */}
      <button
        onClick={() => setShowParams(!showParams)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl mb-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings size={16} />
          <span>{showParams ? "Hide" : "Show"} Advanced Parameters</span>
        </div>
        <div className={`transform transition-transform duration-300 ${showParams ? "rotate-180" : ""}`}>
           ▼
        </div>
      </button>

      {/* ====== PARAMETERS INPUT ====== */}
      {showParams && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2">
            {algorithm !== "genetic" && algorithm !== "simulated-annealing" && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Max Iterations</label>
                <input
                  type="number"
                  value={params.maxIterations}
                  onChange={(e) => setParams({ ...params, maxIterations: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
            {algorithm === "tabu-search" && (
             <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Tabu Tenure</label>
                <input
                  type="number"
                  value={params.tabuTenure || 10}
                  onChange={(e) => setParams({ ...params, tabuTenure: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            )}
            {algorithm === "simulated-annealing" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Initial Temp</label>
                  <input
                    type="number"
                    value={params.initialTemp}
                    onChange={(e) => setParams({ ...params, initialTemp: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cooling Rate</label>
                  <input
                    type="number"
                    step="0.001"
                    value={params.coolingRate}
                    onChange={(e) => setParams({ ...params, coolingRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </>
            )}
            {algorithm === "genetic" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Population Size</label>
                  <input
                    type="number"
                    value={params.populationSize}
                    onChange={(e) => setParams({ ...params, populationSize: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Generations</label>
                  <input
                    type="number"
                    value={params.generations}
                    onChange={(e) => setParams({ ...params, generations: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </>
            )}
        </div>
      )}

      {/* ====== ACTION BUTTONS AREA (RAPID LAYOUT) ====== */}
      <div className="flex flex-col gap-3">
        
        {/* ROW 1: OPTIMIZE & VISUALIZE (Grid 2 Kolom) */}
        <div className={`grid gap-3 ${hasResults ? "grid-cols-2" : "grid-cols-1"}`}>
          {/* Tombol Optimize */}
          <button
            onClick={solveRoute}
            disabled={solving || locations.length < 3}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
          >
            <Zap size={18} className={solving ? "animate-spin" : ""} />
            {solving ? "Processing..." : "Optimize"}
          </button>

          {/* Tombol Visualize (Hanya muncul jika ada hasil) */}
          {hasResults && (
            <button
              onClick={isVisualizing ? stopVisualization : startVisualization}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all shadow-sm ${
                isVisualizing
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {isVisualizing ? <EyeOff size={18} /> : <Eye size={18} />}
              {isVisualizing ? "Stop" : "Visualize"}
            </button>
          )}
        </div>

        {/* CONTROLS (Hanya muncul jika ada history) */}
        {hasResults && (
          <>
            {/* ROW 2: PLAY & RESET (Grid 2 Kolom) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all shadow-sm ${
                    isPlaying 
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                }`}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                onClick={() => {
                    setIsPlaying(false);
                    setCurrentIteration(0);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all shadow-sm font-medium"
              >
                <RotateCcw size={18} />
                Reset
              </button>
            </div>

            {/* ROW 3: SPEED SLIDER (Full Width) */}
            <div className="bg-gray-100 p-3 rounded-xl border border-gray-200 mt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Animation Speed
                </label>
                <span className="text-xs font-mono font-medium bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                  {playSpeed}ms
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={playSpeed}
                onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}