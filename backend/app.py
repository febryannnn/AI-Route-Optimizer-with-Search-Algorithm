from flask import Flask, request, jsonify
from flask_cors import CORS
from enum import Enum
import requests
import random
import math
import json
import os

app = Flask(__name__)
CORS(app)

LOCATION_FILE = "./data/locations.json"
class ROUTE_METHOD(Enum):
    CAR = "driving"
    BIKE = "bike"

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


def osrm_distance(p1, p2, route_method:ROUTE_METHOD):
    key = (p1["lat"], p1["lng"], p2["lat"], p2["lng"])
    if key in distance_cache:
        return distance_cache[key]

    url = f"https://router.project-osrm.org/route/v1/{route_method.value}/{p1['lng']},{p1['lat']};{p2['lng']},{p2['lat']}?overview=false"

    try:
        res = requests.get(url, timeout=5).json()
        d = res["routes"][0]["distance"]
    except:
        d = 9999999

    distance_cache[key] = d
    return d

def osrm_route_path(p1, p2, route_method:ROUTE_METHOD):    
    url = f"https://router.project-osrm.org/route/v1/{route_method.value}/{p1['lng']},{p1['lat']};{p2['lng']},{p2['lat']}?overview=full&geometries=geojson"

    try:
        res = requests.get(url, timeout=5).json()
        return res["routes"][0]["geometry"]["coordinates"]
    except:
        return []


# ==================================================================
# Distance Matrix
# ==================================================================
def build_distance_matrix(locations:list):
    n = len(locations)

    dist_car = [[0] * n for _ in range(n)]
    dist_bike = [[0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i != j:
                dist_car[i][j] = osrm_distance(locations[i], locations[j], ROUTE_METHOD.CAR)
                dist_bike[i][j] = osrm_distance(locations[i], locations[j], ROUTE_METHOD.BIKE)
    return dist_car, dist_bike


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
def genetic_algorithm(dist_car, dist_bike, pop_size, generations, mutation_rate, car_count, bike_count):
    
    n_location = len(dist_car)
    depot_idx = 0
    customer_locations = list(range(1, n_location))
    total_vehicles = car_count + bike_count

    def generate_chrom():
        route = customer_locations[:]
        random.shuffle(route)

        if total_vehicles <= 1 or len(route) < total_vehicles:
            return route

        n_separators = min(total_vehicles - 1, len(route) - 1)

        max_separators = len(route) - 1
        if n_separators > max_separators:
            n_separators = max_separators

        separator_pos = sorted(random.sample(range(1, len(route)), n_separators))

        chrom = []
        prev = 0
        for pos in separator_pos:
            chrom.extend(route[prev:pos])
            chrom.append(-1)
            prev = pos
        chrom.extend(route[prev:])

        return chrom 

    def generate_population(population_size: int):
        return [generate_chrom() for _ in range(population_size)]
    
    def decode_chrom(chrom):
        routes = []
        current_route = []

        for gene in chrom:
            if gene == -1:
                if current_route:
                    routes.append(current_route)
                    current_route = []
            else:
                current_route.append(gene)
        
        if current_route:
            routes.append(current_route)

        routes_with_types = []
        for i, route in enumerate(routes):
            vehicle_types = 0 if i < car_count else 1
            full_route = [depot_idx] + route + [depot_idx]
            routes_with_types.append((full_route, vehicle_types))

        return routes_with_types
    
    def calculate_cost(routes_with_types):
        total = 0
        for route, vehicle_types in routes_with_types:
            dist = dist_bike if vehicle_types == 1 else dist_car
            for i in range(len(route) - 1):
                total += dist[route[i]][route[i+1]]
        return total

    def fitness(chrom):
        routes = decode_chrom(chrom)
        cost = calculate_cost(routes)

        num_routes = len(routes)
        if num_routes < total_vehicles:
            penalty = 100000 * (total_vehicles - num_routes)
            cost += penalty
        
        return 1 / (1 + cost)

    def aex_crossover(parent1, parent2):
        p1_customer = [g for g in parent1 if g != -1]
        p2_customer = [g for g in parent2 if g != -1]

        if len(p1_customer) < 2:
            return parent1[:]
        
        # adjacency list customer location
        def build_edge(tour):
            edges = {}
            for i in range(len(tour)):
                current = tour[i]
                next_city = tour[(i + 1) % len(tour)]
                if current not in edges:
                    edges[current] = []
                edges[current].append(next_city)
            return edges
        
        edges_p1 = build_edge(p1_customer)
        edges_p2 = build_edge(p2_customer)

        child = []
        current = random.choice(p1_customer)
        child.append(current)
        visited = {current}
        
        use_parent1 = True 
        
        while len(child) < len(p1_customer):
            edges = edges_p1 if use_parent1 else edges_p2
            
            candidates = [city for city in edges.get(current, []) if city not in visited]
            
            if candidates:
                next_city = candidates[0]
            else:
                # if no next loc, random from p1
                unvisited = [city for city in p1_customer if city not in visited]
                if not unvisited:
                    break
                next_city = unvisited[0]
            
            child.append(next_city)
            visited.add(next_city)
            current = next_city
            use_parent1 = not use_parent1
        
        # reinsert separators
        if total_vehicles > 1 and len(child) > total_vehicles:
            num_separators = total_vehicles - 1
            separator_positions = sorted(random.sample(range(1, len(child)), num_separators))
            
            chromosome = []
            prev = 0
            for pos in separator_positions:
                chromosome.extend(child[prev:pos])
                chromosome.append(-1)
                prev = pos
            chromosome.extend(child[prev:])
            return chromosome
        else:
            return child

    def inversion_mutation(chrom):
        if random.random() < mutation_rate:
            mutation_type = random.choice(['inversion', 'move_separator'])
            
            if mutation_type == 'inversion':
                customer_indices = [i for i, g in enumerate(chrom) if g != -1]
                
                if len(customer_indices) >= 2:
                    # pick 2 points
                    i, j = sorted(random.sample(customer_indices, 2))
                    
                    # extract segmen
                    segment = []
                    segment_indices = []
                    for idx in range(i, j + 1):
                        if chrom[idx] != -1:
                            segment.append(chrom[idx])
                            segment_indices.append(idx)
                    
                    # reverse segment
                    segment.reverse()
                    
                    # put segment back
                    for idx, val in zip(segment_indices, segment):
                        chrom[idx] = val
            
            elif mutation_type == 'move_separator' and total_vehicles > 1:
                # move separator
                sep_indices = [i for i, g in enumerate(chrom) if g == -1]
                if sep_indices:
                    sep_idx = random.choice(sep_indices)
                    chrom.pop(sep_idx)
                    # insert at new pos
                    customer_indices = [i for i, g in enumerate(chrom) if g != -1]
                    if customer_indices:
                        new_pos = random.choice(customer_indices)
                        chrom.insert(new_pos, -1)
        
        return chrom

    population = generate_population(pop_size)
    history = []
    best_chrom = None
    best_cost = float("inf")

    for gen in range(generations):
        scored = [(ind, fitness(ind)) for ind in population]
        scored.sort(key=lambda x: x[1], reverse=True)

        best = scored[0][0]
        routes = decode_chrom(best)
        cost = calculate_cost(routes)

        if cost < best_cost:
            best_cost = cost
            best_chrom = best[:]

        if gen % 5 == 0:
            car_routes = sum(1 for _, vtype in routes if vtype == 0)
            bike_routes = sum(1 for _, vtype in routes if vtype == 1)
            history.append({
                "iteration": gen,
                "cost": best_cost,
                "carsUsed": car_routes,
                "bikesUsed": bike_routes
            })

        # new pop with selection and elitism
        new_pop = [best]
        
        while len(new_pop) < pop_size:
            # tournament selections
            parents = random.sample(scored[:max(15, pop_size // 3)], 2)
            p1, _ = parents[0]
            p2, _ = parents[1]

            child = aex_crossover(p1, p2)
            
            child = inversion_mutation(child)
            
            new_pop.append(child)

        population = new_pop
    
    final_routes = decode_chrom(best_chrom)

    return final_routes, best_cost, history

# ==================================================================
# ROUTING API - TSP
# ==================================================================
@app.route("/api/solve/<algorithm>", methods=["POST"])
def solve(algorithm):
    data = request.json

    if "locations" in data:
        locations = data["locations"]
        params = data["params"]

        dist_car, dist_bike = build_distance_matrix(locations)

        if algorithm == "hill-climbing":
            # route, cost, history = hill_climbing(dist, params["maxIterations"])
            pass

        elif algorithm == "simulated-annealing":
            # route, cost, history = simulated_annealing(
                # dist, params["maxIterations"], params["initialTemp"], params["coolingRate"]
            # )
            pass

        elif algorithm == "genetic":
            routes_with_types, cost, history = genetic_algorithm(
                dist_car,
                dist_bike,
                params["populationSize"], 
                params["generations"], 
                params["mutationRate"],
                params.get("carCount", 2),
                params.get("bikeCount", 1)
            )
            
            vehicle_routes = []
            vehicle_paths = []
            vehicle_types = []
            
            for route, vehicle_type in routes_with_types:
                route_method = ROUTE_METHOD.BIKE if vehicle_type == 1 else ROUTE_METHOD.CAR
                
                route_locations = [locations[i] for i in route]
                vehicle_routes.append(route_locations)
                vehicle_types.append("bike" if vehicle_type == 1 else "car")
                
                path = []
                for i in range(len(route) - 1):
                    p1 = locations[route[i]]
                    p2 = locations[route[i+1]]
                    path.extend(osrm_route_path(p1, p2, route_method))
                vehicle_paths.append(path)
            
            return jsonify({
                "algorithm": "genetic",
                "vehicleRoutes": vehicle_routes,
                "vehiclePaths": vehicle_paths,
                "vehicleTypes": vehicle_types,
                "finalCost": cost,
                "history": history,
                "totalVehicles": len(routes_with_types)
            })
        else:
            return jsonify({"error": "Algorithm Not Found"}), 400

        # # convert index to actual coords
        # final_route = [locations[i] for i in route]

        # # Build full OSRM path
        # full_path = []
        # for i in range(len(route)-1):
        #     p1 = locations[route[i]]
        #     p2 = locations[route[i+1]]
        #     full_path.extend(osrm_route_path(p1, p2))
        # # round trip
        # full_path.extend(osrm_route_path(locations[route[-1]], locations[route[0]]))

        # return jsonify({
        #     "finalRoute": final_route,
        #     "finalCost": cost,
        #     "history": history,
        #     "path": full_path
        # })
    
    else:
        return jsonify({"error": "No valid input data"}), 400
    

@app.get("/api/locations")
def get_locations():
    with open(LOCATION_FILE, "r") as f:
        data = json.load(f)
    return jsonify(data)

@app.post("/api/locations")
def add_location():
    new_loc = request.json

    with open(LOCATION_FILE, "r") as f:
        data = json.load(f)
    data.append(new_loc)
    with open(LOCATION_FILE, "w") as f:
        json.dump(data, f, indent=2)    

    return jsonify({"message": "Location added", "locations": data})

@app.post("/api/locations/delete")
def delete_location():
    loc_to_be_deleted = request.json
    
    with open(LOCATION_FILE, "r") as f:
        data = json.load(f)
    
    index_to_delete = None
    for i, loc in enumerate(data):
        if loc["name"].lower() == loc_to_be_deleted["name"].lower():
            index_to_delete = i
            break
    
    if index_to_delete is None:
        return jsonify({"error": f"Location '{loc_to_be_deleted}' not found"}), 404
    
    deleted_location = data.pop(index_to_delete)
    
    with open(LOCATION_FILE, "w") as f:
        json.dump(data, f, indent=2)
    
    return jsonify({
        "message": "Location removed",
        "deleted": deleted_location,
        "locations": data
    })


if __name__ == "__main__":
    app.run(debug=True)