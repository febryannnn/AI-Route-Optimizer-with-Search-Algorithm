// Use relative URLs - requests will be proxied by Express to Flask backend
const API_URL = "http://localhost:5000";
import axios from "axios";

export const api = {
  // Hill Climbing Algorithm
  solveHillClimbing: async (locations, params = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/solve/hill-climbing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations,
          params: {
            vehicles: params.vehicles,
            maxIterations: params.maxIterations || 50,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to solve with Hill Climbing");
      }

      return await response.json();
    } catch (error) {
      console.error("Hill Climbing error:", error);
      throw error;
    }
  },

  // Simulated Annealing Algorithm
  solveSimulatedAnnealing: async (locations, params = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/solve/simulated-annealing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations,
          params: {
            vehicles: params.vehicles,
            initialTemp: params.initialTemp || 1000,
            coolingRate: params.coolingRate || 0.995,
            maxIterations: params.maxIterations || 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to solve with Simulated Annealing");
      }

      return await response.json();
    } catch (error) {
      console.error("Simulated Annealing error:", error);
      throw error;
    }
  },

  solveTabuSearch: async (locations, params = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/solve/simulated-annealing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations,
          params: {
            vehicles: params.vehicles,
            initialTemp: params.initialTemp || 1000,
            coolingRate: params.coolingRate || 0.995,
            maxIterations: params.maxIterations || 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to solve with Simulated Annealing");
      }

      return await response.json();
    } catch (error) {
      console.error("Simulated Annealing error:", error);
      throw error;
    }
  },

  // GENETIC ALGORITHM
  solveGenetic: async (locations, params = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/solve/genetic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations,
          params: {
            vehicles: params.vehicles,
            populationSize: params.populationSize || 100,
            generations: params.generations || 1000,
            mutationRate: params.mutationRate || 0.02,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to solve with Genetic Algorithm");
      }

      return await response.json();
    } catch (error) {
      console.error("Genetic Algorithm error:", error);
      throw error;
    }
  },

  saveLocation: async (locationData) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/locations",
        locationData
      );
      return response.data;
    } catch (error) {
      console.error("Error saving location:", error);
      throw error;
    }
  },

  // Fungsi untuk delete location (opsional)
  deleteLocation: async (locationData) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/locations/delete`,
        locationData
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting location:", error);
      throw error;
    }
  },

  updateVehicle: async (vehicleData) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/vehicle/update",
        vehicleData
      );
      return response.data;
    } catch (error) {
      console.error("Error saving location:", error);
      throw error;
    }
  },

  deleteVehicle: async (vehicleData) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/vehicle/delete",
        vehicleData
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting location:", error);
      throw error;
    }
  },

  // Generic solve function that routes to appropriate algorithm
  solve: async (algorithm, data) => {
    switch (algorithm) {
      case "hill-climbing":
        return await api.solveHillClimbing(
          data.locations,
          data.params?.maxIterations
        );
      case "simulated-annealing":
        return await api.solveSimulatedAnnealing(data.locations, data.params);
      case "genetic":
        return await api.solveGenetic(data.locations, data.params);
      case "tabu-search":
        return await api.solveTabuSearch(data.locations, data.params);
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
  },
};

export default api;
