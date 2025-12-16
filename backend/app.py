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
VEHICLE_FILE = "./data/vehicles.json"

class ROUTE_METHOD(Enum):
    CAR = "driving"
    BIKE = "bike"

# OSRM Distance
distance_cache = {}

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

def route_cost(route, dist):
    total = 0
    for i in range(len(route) - 1):
        total += dist[route[i]][route[i+1]]
    total += dist[route[-1]][route[0]]
    return total


# TABU SEARCH
from algorithms.TabuSearch import solve_tabu_search
# SIMULATED ANNEALING
from algorithms.simulatedAnnealing import simulated_annealing
# GENETIC ALGORITHM
from algorithms.GeneticAlgorithm import genetic_algorithm

# ==================================================================
# ROUTING API - TSP
# ==================================================================
@app.route("/api/solve/<algorithm>", methods=["POST"])
def solve(algorithm):
    data = request.json

    if "locations" not in data:
        return jsonify({"error": "No valid input data"}), 400

    # Global input
    locations = data["locations"]
    params = data["params"]

    # Bangun matriks jarak
    dist_car, dist_bike = build_distance_matrix(locations)

    # Bangun demands
    demands = [0] + [loc.get("demand", 0) for loc in locations[1:]]
    vehicles = params.get("vehicles", [])
    
    car_count = 0
    bike_count = 0
    car_capacity = 0
    bike_capacity = 0
    
    for v in vehicles:
        if v["type"].lower() in ["mobil", "car"]:
            car_count = v["count"]
            car_capacity = v["capacity"]

        elif v["type"].lower() in ["motor", "bike"]:
            bike_count = v["count"]
            bike_capacity = v["capacity"]

    # ============================
    # ALGORITHM: TABU SEARCH
    # ============================
    if algorithm == "tabu-search":
        max_iter = params.get("maxIterations", 500)

        best_routes, best_cost, history, vehicle_list = solve_tabu_search(
            dist_car,
            dist_bike,
            demands,
            vehicles,
            max_iter
        )

        vehicle_routes = []
        vehicle_paths = []
        vehicle_types = []

        for idx, route in enumerate(best_routes):
            if idx < len(vehicle_list):
                vtype = vehicle_list[idx]["type"]
            else:
                vtype = "unknown"

            vehicle_types.append(vtype)

            full_route = [0] + route + [0]
            route_locations = [locations[i] for i in full_route]
            vehicle_routes.append(route_locations)

            method = ROUTE_METHOD.BIKE if vtype.lower() == "motor" else ROUTE_METHOD.CAR

            path = []
            for i in range(len(full_route) - 1):
                p1 = locations[full_route[i]]
                p2 = locations[full_route[i + 1]]
                path.extend(osrm_route_path(p1, p2, method))

            vehicle_paths.append(path)

        return jsonify({
            "algorithm": "tabu-search",
            "vehicleRoutes": vehicle_routes,
            "vehiclePaths": vehicle_paths,
            "vehicleTypes": vehicle_types,
            "finalCost": best_cost,
            "history": history,
            "totalVehicles": len(vehicle_routes)
        })

    # ============================
    # ALGORITHM: SIMULATED ANNEALING
    # ============================
    elif algorithm == "simulated-annealing":

        max_iter = params.get("maxIterations", 500)
        initial_temp = params.get("initialTemp", 1000)
        cooling_rate = params.get("coolingRate", 0.995)

        print(f"SA Parameters: maxIter={max_iter}, temp={initial_temp}, cooling={cooling_rate}")

        best_routes, best_cost, history, vehicle_list = simulated_annealing(
            dist_car,
            dist_bike,
            demands,
            vehicles,
            max_iter,
            initial_temp,
            cooling_rate
        )

        vehicle_routes = []
        vehicle_paths = []
        vehicle_types = []

        for idx, route in enumerate(best_routes):
            if not route:
                continue

            vtype = vehicle_list[idx]["type"]
            vehicle_types.append(vtype)

            # Tambahkan depot di awal, dan handle depot markers (0) di tengah
            route_with_depots = [0]  # Start from depot
            
            for customer in route:
                if customer == 0:
                    # Marker untuk kembali ke depot dan mulai trip baru
                    route_with_depots.append(0)  # Kembali ke depot
                    route_with_depots.append(0)  # Mulai dari depot lagi
                else:
                    route_with_depots.append(customer)
            
            route_with_depots.append(0)  # End at depot
            
            # Convert ke locations
            route_locations = [locations[i] for i in route_with_depots]
            vehicle_routes.append(route_locations)

            # Generate path untuk visualisasi
            method = ROUTE_METHOD.BIKE if vtype.lower() == "motor" else ROUTE_METHOD.CAR

            path = []
            for i in range(len(route_with_depots) - 1):
                p1 = locations[route_with_depots[i]]
                p2 = locations[route_with_depots[i + 1]]
                path.extend(osrm_route_path(p1, p2, method))

            vehicle_paths.append(path)

        return jsonify({
            "algorithm": "simulated-annealing",
            "vehicleRoutes": vehicle_routes,
            "vehiclePaths": vehicle_paths,
            "vehicleTypes": vehicle_types,
            "finalCost": best_cost,
            "history": history,
            "totalVehicles": len(vehicle_routes),
            "parameters": {
                "initialTemp": initial_temp,
                "coolingRate": cooling_rate,
                "maxIterations": max_iter
            }
        })
    
    # elif algorithm == "simulated-annealing":
        max_iter = params.get("maxIterations", 500)
        initial_temp = params.get("initialTemp", 1000)
        cooling_rate = params.get("coolingRate", 0.995)

        print(f"SA Parameters: maxIter={max_iter}, temp={initial_temp}, cooling={cooling_rate}")

        best_routes, best_cost, history, vehicle_list = simulated_annealing(
            dist_car,
            dist_bike,
            demands,
            vehicles,
            max_iter,
            initial_temp,
            cooling_rate
        )

        vehicle_routes = []
        vehicle_paths = []
        vehicle_types = []

        for idx, route in enumerate(best_routes):
            if not route:
                continue

            vtype = vehicle_list[idx]["type"]
            vehicle_types.append(vtype)

            # ✅ Handle depot markers dengan benar
            route_with_depots = [0]  # Start from depot
            
            for customer in route:
                if customer == 0:
                    # Marker: kembali ke depot dan mulai trip baru
                    route_with_depots.append(0)  # Kembali ke depot (end trip)
                    # Tidak perlu append 0 lagi karena trip baru akan otomatis dari depot
                else:
                    route_with_depots.append(customer)
            
            route_with_depots.append(0)  # End at depot
            
            # Convert ke locations
            route_locations = [locations[i] for i in route_with_depots]
            vehicle_routes.append(route_locations)

            # Generate path
            method = ROUTE_METHOD.BIKE if vtype.lower() == "motor" else ROUTE_METHOD.CAR

            path = []
            for i in range(len(route_with_depots) - 1):
                p1 = locations[route_with_depots[i]]
                p2 = locations[route_with_depots[i + 1]]
                path.extend(osrm_route_path(p1, p2, method))

            vehicle_paths.append(path)

        return jsonify({
            "algorithm": "simulated-annealing",
            "vehicleRoutes": vehicle_routes,
            "vehiclePaths": vehicle_paths,
            "vehicleTypes": vehicle_types,
            "finalCost": best_cost,
            "history": history,
            "totalVehicles": len(vehicle_routes),
            "parameters": {
                "initialTemp": initial_temp,
                "coolingRate": cooling_rate,
                "maxIterations": max_iter
            }
        })
    
    # ============================
    # ALGORITHM: GENETIC
    # ============================
    elif algorithm == "genetic":
                vehicles = params.get("vehicles", [])
                car_count = 0
                bike_count = 0
                car_capacity = 100  # default capacity
                bike_capacity = 50   # default capacity

                for vehicle in vehicles:
                    vtype = vehicle.get("type", "").lower()
                    count = vehicle.get("count", 1)
                    cap = vehicle.get("capacity", 0)

                    if vtype in ["car", "mobil"]:
                        car_count = count
                        if cap > 0:
                            car_capacity = cap
                    elif vtype in ["bike", "motor", "motorcycle"]:
                        bike_count = count
                        if cap > 0:
                            bike_capacity = cap

                # default value
                if car_count == 0 and bike_count == 0:
                    car_count = 2
                    bike_count = 1

                demands = [0] + [loc.get("demand", 0) for loc in locations[1:]]

                routes_with_types, cost, history = genetic_algorithm(
                    dist_car,
                    dist_bike,
                    params.get("populationSize", 50),
                    params.get("generations", 100),
                    params.get("mutationRate", 0.05),
                    car_count,
                    bike_count,
                    car_capacity,    
                    bike_capacity,   
                    demands
                )

                vehicle_routes = []
                vehicle_paths = []
                vehicle_types = []
                
                for route_info in routes_with_types:
                    route = route_info["route"]
                    vtype = route_info["type"]
                    vehicle_types.append(vtype)

                    route_locations = [locations[i] for i in route]
                    vehicle_routes.append(route_locations)

                    method = ROUTE_METHOD.BIKE if vtype.lower() == "bike" else ROUTE_METHOD.CAR
            
                    path = []
                    for i in range(len(route) - 1):
                        p1 = locations[route[i]]
                        p2 = locations[route[i + 1]]
                        path.extend(osrm_route_path(p1, p2, method))

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
    # ============================
    # WRONG ALGORITHM
    # ============================
    else:
        return jsonify({"error": "Algorithm Not Found"}), 400

    
@app.get("/api/locations")
def get_locations():
    with open(LOCATION_FILE, "r") as f:
        data = json.load(f)
    return jsonify(data)

@app.get("/api/vehicles")
def get_vehicles():
    with open(VEHICLE_FILE, "r") as f:
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
    
@app.post("/api/vehicle/update")
def update_vehicle():
    update_item = request.json

    with open(VEHICLE_FILE, "r") as f:
        data = json.load(f)

    found = False
    for v in data:
        if v["type"] == update_item["type"]:
            v["count"] = update_item["count"] 
            found = True
            break

    if not found:
        return jsonify({"error": "Vehicle with given type not found"}), 404
    
    with open(VEHICLE_FILE, "w") as f:
        json.dump(data, f, indent=2)

    return jsonify({
        "message": "Vehicle updated",
        "vehicles": data
    })

@app.post("/api/vehicle/delete")
def delete_vehicle():
    deleted_vehicle = request.json

    with open(VEHICLE_FILE, "r") as f:
        data = json.load(f)
    data.remove(deleted_vehicle)
    with open(VEHICLE_FILE, "w") as f:
        json.dump(data, f, indent=2)    

    return jsonify({"message": "Location removed", "locations": data})

if __name__ == "__main__":
    app.run(debug=True)