import { MapPin } from "lucide-react";

export default function Navbar({ locations }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-[999] shadow-sm">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo + Title */}
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

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Locations</div>
              <div className="text-2xl text-blue-600">{locations.length}</div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
