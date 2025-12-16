import React from "react";
import { Settings } from "lucide-react";
import AlgorithmPanel from "./AlgorithmPanel";

const AlgorithmControl = ({
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
}) => {
  return (
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
  );
};

export default AlgorithmControl;
