// Use relative URLs - requests will be proxied by Express to Flask backend
const API_URL = 'http://localhost:5000';

export const api = {
  // Hill Climbing Algorithm
  solveHillClimbing: async (locations, maxIterations = 500) => {
    try {
      const response = await fetch(`${API_URL}/api/solve/hill-climbing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations,
          params: {
            maxIterations
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to solve with Hill Climbing');
      }

      return await response.json();
    } catch (error) {
      console.error('Hill Climbing error:', error);
      throw error;
    }
  },

  // Simulated Annealing Algorithm
  solveSimulatedAnnealing: async (locations, params = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/solve/simulated-annealing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations,
          params: {
            initialTemp: params.initialTemp || 1000,
            coolingRate: params.coolingRate || 0.995,
            maxIterations: params.maxIterations || 500
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to solve with Simulated Annealing');
      }

      return await response.json();
    } catch (error) {
      console.error('Simulated Annealing error:', error);
      throw error;
    }
  },

  // Genetic Algorithm
  solveGenetic: async (locations, params = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/solve/genetic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations,
          params: {
            populationSize: params.populationSize || 100,
            generations: params.generations || 1000,
            mutationRate: params.mutationRate || 0.02
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to solve with Genetic Algorithm');
      }

      return await response.json();
    } catch (error) {
      console.error('Genetic Algorithm error:', error);
      throw error;
    }
  },

  // Generic solve function that routes to appropriate algorithm
  solve: async (algorithm, data) => {
      switch (algorithm) {
        case 'hill-climbing':
          return await api.solveHillClimbing(data.locations, data.params?.maxIterations);
        case 'simulated-annealing':
          return await api.solveSimulatedAnnealing(data.locations, data.params);
        case 'genetic':
          return await api.solveGenetic(data.locations, data.params);
        case 'tabu-search':
          return await api.solveTabuSearch(data.locations, data.params);
        default:
          throw new Error(`Unknown algorithm: ${algorithm}`);
      }
    }
  };

export default api;
