import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Zap, Play } from "lucide-react";

const OptimizationChart = ({ chartData }) => {
  return (
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
  );
};

export default OptimizationChart;
