import React from "react";

const ErrorPopup = ({ errorPopup, setErrorPopup }) => {
  if (!errorPopup.show) return null;

  return (
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
  );
};

export default ErrorPopup;
