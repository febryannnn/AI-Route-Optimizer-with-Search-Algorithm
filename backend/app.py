from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import random
import math

app = Flask(__name__)
CORS(app)

# ==================================================================
# OSRM Distance
# ==================================================================
distance_cache = {}

def euclidean(p1, p2):
    R = 6371  # km
    lat1, lon1 = math.radians(p1["lat"]), math.radians(p1["lng"])
    lat2, lon2 = math.radians(p2["lat"]), math.radians(p2["lng"])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def osrm_distance(p1, p2):
    key = (p1["lat"], p1["lng"], p2["lat"], p2["lng"])
    if key in distance_cache:
        return distance_cache[key]

    url = f"https://router.project-osrm.org/route/v1/driving/{p1['lng']},{p1['lat']};{p2['lng']},{p2['lat']}?overview=false"

    try:
        res = requests.get(url, timeout=5).json()
        d = res["routes"][0]["distance"]
    except:
        d = 9999999

    distance_cache[key] = d
    return d

def osrm_route_path(p1, p2):
    url = f"https://router.project-osrm.org/route/v1/driving/{p1['lng']},{p1['lat']};{p2['lng']},{p2['lat']}?overview=full&geometries=geojson"
    try:
        res = requests.get(url, timeout=5).json()
        return res["routes"][0]["geometry"]["coordinates"]
    except:
        return []


# ==================================================================
# Distance Matrix
# ==================================================================
def build_distance_matrix(locations):
    n = len(locations)
    dist = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dist[i][j] = osrm_distance(locations[i], locations[j])
    return dist


# ==================================================================
# Cost
# ==================================================================
def route_cost(route, dist):
    total = 0
    for i in range(len(route) - 1):
        total += dist[route[i]][route[i+1]]
    total += dist[route[-1]][route[0]]
    return total


# ==================================================================
# Hill Climbing
# ==================================================================
def hill_climbing(dist, max_iter):
    n = len(dist)
    current = list(range(n))
    random.shuffle(current)

    best = current[:]
    best_cost = route_cost(best, dist)

    history = [{"iteration": 0, "route": best[:], "cost": best_cost}]

    for it in range(1, max_iter + 1):
        i, j = random.sample(range(n), 2)
        candidate = best[:]
        candidate[i], candidate[j] = candidate[j], candidate[i]

        cost = route_cost(candidate, dist)
        if cost < best_cost:
            best = candidate[:]
            best_cost = cost

        history.append({"iteration": it, "route": best[:], "cost": best_cost})

    return best, best_cost, history


# ==================================================================
# Simulated Annealing
# ==================================================================
def simulated_annealing(dist, max_iter, temp, cooling):
    n = len(dist)
    current = list(range(n))
    random.shuffle(current)
    current_cost = route_cost(current, dist)

    best = current[:]
    best_cost = current_cost

    history = [{"iteration": 0, "route": current[:], "cost": current_cost, "temperature": temp}]

    for it in range(1, max_iter + 1):
        i, j = random.sample(range(n), 2)
        candidate = current[:]
        candidate[i], candidate[j] = candidate[j], candidate[i]

        new_cost = route_cost(candidate, dist)
        delta = new_cost - current_cost

        if delta < 0 or random.random() < math.exp(-delta / temp):
            current = candidate[:]
            current_cost = new_cost

        if current_cost < best_cost:
            best = current[:]
            best_cost = current_cost

        temp *= cooling

        history.append({
            "iteration": it,
            "route": current[:],
            "cost": current_cost,
            "temperature": temp
        })

    return best, best_cost, history


# ==================================================================
# Genetic Algorithm
# ==================================================================
def genetic_algorithm(dist, pop_size, generations, mutation_rate):
    n = len(dist)

    def create_individual():
        route = list(range(n))
        random.shuffle(route)
        return route

    def fitness(route):
        return 1 / (1 + route_cost(route, dist))

    def crossover(a, b):
        start, end = sorted(random.sample(range(n), 2))
        child = [None] * n

        child[start:end] = a[start:end]

        ptr = end
        for city in b:
            if city not in child:
                if ptr >= n:
                    ptr = 0
                child[ptr] = city
                ptr += 1

        return child

    def mutate(route):
        if random.random() < mutation_rate:
            i, j = random.sample(range(n), 2)
            route[i], route[j] = route[j], route[i]
        return route

    population = [create_individual() for _ in range(pop_size)]
    history = []
    best_route = None
    best_cost = float("inf")

    for gen in range(generations):
        scored = [(ind, fitness(ind)) for ind in population]
        scored.sort(key=lambda x: x[1], reverse=True)

        best = scored[0][0]
        best_gen_cost = route_cost(best, dist)

        if best_gen_cost < best_cost:
            best_cost = best_gen_cost
            best_route = best[:]

        if gen % 5 == 0:
            history.append({
                "iteration": gen,
                "route": best_route[:],
                "cost": best_cost
            })

        new_pop = [best]
        while len(new_pop) < pop_size:
            parents = random.sample(scored[:15], 2)
            p1, _ = parents[0]
            p2, _ = parents[1]

            child = crossover(p1, p2)
            child = mutate(child)
            new_pop.append(child)

        population = new_pop

    return best_route, best_cost, history

# ==================================================================
# ROUTING API - TSP
# ==================================================================
@app.route("/api/solve/<algorithm>", methods=["POST"])
def solve(algorithm):
    data = request.json

    # =========================
    # TSP Algorithms
    # =========================
    if "locations" in data:
        locations = data["locations"]
        params = data["params"]

        dist = build_distance_matrix(locations)

        if algorithm == "hill-climbing":
            route, cost, history = hill_climbing(dist, params["maxIterations"])

        elif algorithm == "simulated-annealing":
            route, cost, history = simulated_annealing(
                dist, params["maxIterations"], params["initialTemp"], params["coolingRate"]
            )

        elif algorithm == "genetic":
            route, cost, history = genetic_algorithm(
                dist, params["populationSize"], params["generations"], params["mutationRate"]
            )
        else:
            return jsonify({"error": "Algorithm Not Found"}), 400

        # convert index to actual coords
        final_route = [locations[i] for i in route]

        # Build full OSRM path
        full_path = []
        for i in range(len(route)-1):
            p1 = locations[route[i]]
            p2 = locations[route[i+1]]
            full_path.extend(osrm_route_path(p1, p2))
        # round trip
        full_path.extend(osrm_route_path(locations[route[-1]], locations[route[0]]))

        return jsonify({
            "finalRoute": final_route,
            "finalCost": cost,
            "history": history,
            "path": full_path
        })
    
    else:
        return jsonify({"error": "No valid input data"}), 400


if __name__ == "__main__":
    app.run(debug=True)