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


# HILL CLIMBING
def hill_climbing(dist, demands, vehicles, max_iter):
    n = len(dist)
    customers = list(range(1, n))

    # Buat struktur data vehicle jadi type dan capacity
    vehicle_list = []
    for v in vehicles:
        for _ in range(v["count"]):
            vehicle_list.append({
                "type": v["type"],
                "capacity": v["capacity"]
            })

    total_vehicles = len(vehicle_list)

    # Random urutan customer
    random.shuffle(customers)
  
    # Format untuk multi-trip rute: 
    # routes[vehicle_idx] = [[customer-1], [customer-2], ...]
    routes = [[] for _ in range(total_vehicles)]
    
    # INISIASI AWAL
    def assign_customers_to_vehicles(customers):
        vehicle_routes = [[] for _ in range(total_vehicles)]
        
        for c in customers:
            assigned = False
            
            for v in range(total_vehicles):
                if not vehicle_routes[v]:
                    # Jika vehicle route untuk kendaraan v masih kosong, buat rute baru
                    vehicle_routes[v].append([c])
                    assigned = True
                    break
                else:
                    # Cek customer terakhir di rute vehicle
                    last_trip = vehicle_routes[v][-1]
                    current_load = sum(demands[x] for x in last_trip)
                    
                    if current_load + demands[c] <= vehicle_list[v]["capacity"]:
                        # Tambahkan customer ke rute jika loadnya cukup
                        last_trip.append(c)
                        assigned = True
                        break
            
            # Kalau belum assigned, coba cari vehicle dengan capacity yang masih cukup atau buat trip baru
            if not assigned:
                for v in range(total_vehicles):
                    # Buat trip baru untuk kendaraan v
                    vehicle_routes[v].append([c])
                    assigned = True
                    break
        
        return vehicle_routes
    
    # Disimpan di routes
    routes = assign_customers_to_vehicles(customers)

    # LIST COST FUNCTION
    def trip_cost(trip):
        if not trip:
            return 0
        cost = dist[0][trip[0]]  # depot ke customer pertama
        for i in range(len(trip)-1):
            cost += dist[trip[i]][trip[i+1]]
        cost += dist[trip[-1]][0]  # customer terakhir ke depot
        return cost

    def vehicle_cost(vehicle_trips):
        """Total cost semua trips dari satu vehicle"""
        return sum(trip_cost(trip) for trip in vehicle_trips)

    def total_cost(routes):
        """Total cost semua vehicles"""
        return sum(vehicle_cost(vehicle_trips) for vehicle_trips in routes)
    
    
    def is_feasible(routes):
        for v_idx, vehicle_trips in enumerate(routes):
            capacity = vehicle_list[v_idx]["capacity"]
            for trip in vehicle_trips:
                trip_load = sum(demands[c] for c in trip)
                if trip_load > capacity:
                    return False
        return True
    
    def count_vehicles_used(routes):
        car_count = 0
        bike_count = 0
        for i, vehicle_trips in enumerate(routes):
            if vehicle_trips and any(trip for trip in vehicle_trips):  # ada trip yang tidak kosong
                if vehicle_list[i]["type"].lower() == "motor":
                    bike_count += 1
                else:
                    car_count += 1
        return car_count, bike_count

    best = [trips[:] for trips in routes]
    best_cost = total_cost(best)

    cars_used, bikes_used = count_vehicles_used(best)
    history = [{
        "iteration": 0, 
        "cost": best_cost,
        "carsUsed": cars_used,
        "bikesUsed": bikes_used
    }]

    # OPTIMASI HILL CLIMBING
    for it in range(1, max_iter + 1):
        candidate = [[trip[:] for trip in vehicle_trips] for vehicle_trips in best]

        # Random move type
        move_type = random.choice(['intra_vehicle', 'inter_vehicle', 'split_trip', 'merge_trip'])
        
        if move_type == 'intra_vehicle':
            # Swap 2 customers dalam vehicle yang sama
            v = random.randrange(total_vehicles)
            if candidate[v]:
                trip_idx = random.randrange(len(candidate[v]))
                if len(candidate[v][trip_idx]) >= 2:
                    i, j = random.sample(range(len(candidate[v][trip_idx])), 2)
                    candidate[v][trip_idx][i], candidate[v][trip_idx][j] = \
                        candidate[v][trip_idx][j], candidate[v][trip_idx][i]
        
        elif move_type == 'inter_vehicle':
            # Pindahkan customer dari satu vehicle ke vehicle lain
            v1, v2 = random.sample(range(total_vehicles), 2)
            if candidate[v1]:
                # Pilih trip dan customer dari v1
                trip1_idx = random.randrange(len(candidate[v1]))
                if candidate[v1][trip1_idx]:
                    cust_idx = random.randrange(len(candidate[v1][trip1_idx]))
                    customer = candidate[v1][trip1_idx].pop(cust_idx)
                    
                    # Hapus trip kosong
                    if not candidate[v1][trip1_idx]:
                        candidate[v1].pop(trip1_idx)
                    
                    # Masukkan ke v2
                    if not candidate[v2]:
                        candidate[v2].append([customer])
                    else:
                        # Coba masukkan ke trip terakhir
                        last_trip = candidate[v2][-1]
                        if sum(demands[c] for c in last_trip) + demands[customer] <= vehicle_list[v2]["capacity"]:
                            last_trip.append(customer)
                        else:
                            # Buat trip baru
                            candidate[v2].append([customer])
        
        elif move_type == 'split_trip':
            # Split satu trip jadi 2 trips
            v = random.randrange(total_vehicles)
            if candidate[v]:
                trip_idx = random.randrange(len(candidate[v]))
                trip = candidate[v][trip_idx]
                if len(trip) >= 2:
                    split_point = random.randint(1, len(trip) - 1)
                    trip1 = trip[:split_point]
                    trip2 = trip[split_point:]
                    candidate[v][trip_idx] = trip1
                    candidate[v].insert(trip_idx + 1, trip2)
        
        elif move_type == 'merge_trip':
            # Merge 2 trips consecutive jadi 1 (jika kapasitas cukup)
            v = random.randrange(total_vehicles)
            if len(candidate[v]) >= 2:
                trip1_idx = random.randrange(len(candidate[v]) - 1)
                trip1 = candidate[v][trip1_idx]
                trip2 = candidate[v][trip1_idx + 1]
                
                total_load = sum(demands[c] for c in trip1) + sum(demands[c] for c in trip2)
                if total_load <= vehicle_list[v]["capacity"]:
                    merged = trip1 + trip2
                    candidate[v][trip1_idx] = merged
                    candidate[v].pop(trip1_idx + 1)

        # Cek feasibility
        if not is_feasible(candidate):
            if it % 5 == 0:
                cars_used, bikes_used = count_vehicles_used(best)
                history.append({
                    "iteration": it, 
                    "cost": best_cost,
                    "carsUsed": cars_used,
                    "bikesUsed": bikes_used
                })
            continue

        # Hitung cost
        c_cost = total_cost(candidate)
        if c_cost < best_cost:
            best = [[trip[:] for trip in vehicle_trips] for vehicle_trips in candidate]
            best_cost = c_cost

        # Log progress
        if it % 5 == 0:
            cars_used, bikes_used = count_vehicles_used(best)
            history.append({
                "iteration": it, 
                "cost": best_cost,
                "carsUsed": cars_used,
                "bikesUsed": bikes_used
            })

    # =====================
    # 5. Format output sama dengan yang lama
    # =====================
    # Flatten routes: ubah multi-trip jadi single list dengan depot di antara trips
    flattened_routes = []
    for vehicle_trips in best:
        vehicle_route = []
        for trip in vehicle_trips:
            if trip:
                vehicle_route.extend(trip)
                vehicle_route.append(0)  # kembali ke depot setelah setiap trip
        # Hapus depot terakhir yang duplikat
        if vehicle_route and vehicle_route[-1] == 0:
            vehicle_route.pop()
        flattened_routes.append(vehicle_route)

    return flattened_routes, best_cost, history, vehicle_list

# ==================================================================
# Simulated Annealing
# ==================================================================
import random
import math
def simulated_annealing_mv(dist_car, dist_bike, demands, vehicles, max_iter, temp, cooling):
    n = len(dist_car)
    customers = list(range(1, n))

    # Buat format vehicle list datanya
    vehicle_list = []
    for v in vehicles:
        for _ in range(v["count"]):
            vehicle_list.append({
                "type": v["type"],
                "capacity": v["capacity"]
            })
    total_vehicles = len(vehicle_list)

    # Pisah distance motor dan mobil
    import random

    # Ambil matriks jarak kendaraan k
    def pisah_dist_by_type(vehicle_idx):
        vtype = vehicle_list[vehicle_idx]["type"].lower()
        return dist_bike if vtype == "motor" else dist_car


    def buat_customer_list(customers):
        v = len(vehicle_list)
        CustomersList = [[] for _ in range(v)]

        for cust in customers:
            demand = demands[cust]

            # Buat customer list dimulai dari kendaraan ke-0
            k = 0
            # Jika demand lebih besar maka cari kendaran lain
            while k < v and demand > vehicle_list[k]["capacity"]:
                k += 1

            # ini kondisi pas looping while berakhir, berarti gaada kendaraan yang bisa nampung --> set error
            if k == v:
                print(f"Customer {cust} tidak bisa dilayani kendaraan manapun")
                continue

            # tambah customer ke vehicle
            CustomersList[k].append(cust)

        return CustomersList

    # Helper function buat hitung minimum insertion cost
    def min_insertion_cost(route, customer, dist, capacity, current_load):
        if current_load + demands[customer] > capacity:
            return None

        best_cost = float('inf')
        best_pos = None
        n = len(route)

        # Jika rute kosong, minimum biaya depot itu depot → cust → depot
        if n == 0:
            cost = dist[0][customer] + dist[customer][0]
            return (cost, 0)

        # Evaluasi semua posisi penyisipan 0..n
        for pos in range(n + 1):
            if pos == 0:
                prev = 0
                next_ = route[0]
            elif pos == n:
                prev = route[-1]
                next_ = 0
            else:
                prev = route[pos - 1]
                next_ = route[pos]

            # Ini adalah fungsi insertion cost
            # jarak dari prev ke customer yang mau ditambah + customer ke next - prev ke next
            # semakin kecil hasilnya semakin bagus, karena rute baru pertambahan jaraknya tidak terlalu besar
            insertion_cost = dist[prev][customer] + dist[customer][next_] - dist[prev][next_]

            if insertion_cost < best_cost:
                best_cost = insertion_cost
                best_pos = pos

        return (best_cost, best_pos)
    
    # BUAT INITIAL SOLUTION DARI PAPER
    def construct_initial_solution(customers):
        v = len(vehicle_list)

        # Buat CustomersList_k
        CustomersList = buat_customer_list(customers)

        while True:  
            # Buat copy list dari customer list
            ToInsert = [lst[:] for lst in CustomersList]

            # inisiasi rute awal (kosong)
            routes = [[] for _ in range(v)]

            # boolean untuk restart (dibutuhkan jika fisibilitas tidak terpenuhi saat assign rute)
            restart_needed = False

            # Assign rute dimulai dari kendaraan dengan capacity terbesar
            for k in range(v - 1, -1, -1):

                while ToInsert[k]:

                    inserted = False
                    cust_list = ToInsert[k][:]

                    # coba semua customer di ToInsert_k
                    for cust in cust_list:

                        # coba insert cust ke kendaraan j = k..v
                        for j in range(k, v):
                            dist = pisah_dist_by_type(j)
                            route_j = routes[j]

                            # hitung load sekarang
                            current_load = sum(demands[x] for x in route_j)

                            insertion = min_insertion_cost(
                                route_j, cust, dist,
                                vehicle_list[j]["capacity"],
                                current_load
                            )

                            if insertion:
                                _, pos = insertion
                                route_j.insert(pos, cust)
                                ToInsert[k].remove(cust)
                                inserted = True
                                break  # Jika berhasil maka assign customer ke rute
 
                        if inserted:
                            break  # next customer

                    # Jika tidak ada customer yang bisa diinsert ke kendaraan manapun
                    if not inserted:
                        # RESET sesuai paper
                        restart_needed = True
                        break  # keluar while

                if restart_needed:
                    break  # keluar loop k

            # jika tidak perlu restart → solusi valid
            if not restart_needed:
                return routes

            # jika perlu restart:
            # pilih random vehicle dan random customer
            j = random.randint(0, v - 1)
            dist = pisah_dist_by_type(j)

            # reset routes & ToInsert
            ToInsert = [lst[:] for lst in CustomersList]
            routes = [[] for _ in range(v)]

            # pilih random customer dari vehicle itu
            possible = ToInsert[j]
            if possible:
                cust = random.choice(possible)
                routes[j].append(cust)
                ToInsert[j].remove(cust)

            # lalu ulangi dari awal (loop while)


        return routes


    # =====================
    # 3. Cost Functions
    # =====================
    def trip_cost(trip, vehicle_idx):
        """Hitung cost trip dengan distance matrix yang sesuai"""
        if not trip:
            return 0
        
        dist = pisah_dist_by_type(vehicle_idx)
        cost = dist[0][trip[0]]
        for i in range(len(trip)-1):
            cost += dist[trip[i]][trip[i+1]]
        cost += dist[trip[-1]][0]
        return cost

    def total_cost(routes):
        """Hitung total cost semua routes"""
        total = 0
        for v_idx, vehicle_trips in enumerate(routes):
            for trip in vehicle_trips:
                total += trip_cost(trip, v_idx)
        return total
    
    def is_feasible(routes):
        """Cek apakah solusi feasible"""
        for v_idx, vehicle_trips in enumerate(routes):
            capacity = vehicle_list[v_idx]["capacity"]
            for trip in vehicle_trips:
                if sum(demands[c] for c in trip) > capacity:
                    return False
        return True

    # =====================
    # 4. Neighborhood Structures
    # =====================
    def neighborhood_swap_within_route(routes):
        """NS₁: Swap 2 customers dalam route yang sama"""
        candidates = []
        for v_idx in range(total_vehicles):
            for trip_idx in range(len(routes[v_idx])):
                trip = routes[v_idx][trip_idx]
                if len(trip) >= 2:
                    # Limit jumlah swap untuk efisiensi
                    max_swaps = min(10, len(trip) * (len(trip) - 1) // 2)
                    swap_count = 0
                    
                    for i in range(len(trip)):
                        for j in range(i+1, len(trip)):
                            if swap_count >= max_swaps:
                                break
                            new_routes = [[t[:] for t in vt] for vt in routes]
                            new_routes[v_idx][trip_idx][i], new_routes[v_idx][trip_idx][j] = \
                                new_routes[v_idx][trip_idx][j], new_routes[v_idx][trip_idx][i]
                            candidates.append(new_routes)
                            swap_count += 1
        return candidates

    def neighborhood_relocate(routes):
        """NS₂: Relocate customer ke route lain"""
        candidates = []
        for v1 in range(total_vehicles):
            for trip1_idx in range(len(routes[v1])):
                trip1 = routes[v1][trip1_idx]
                for cust_idx in range(len(trip1)):
                    customer = trip1[cust_idx]
                    
                    for v2 in range(total_vehicles):
                        if v2 == v1:
                            continue
                        
                        # Limit untuk efisiensi
                        for trip2_idx in range(min(len(routes[v2]) + 1, 5)):
                            new_routes = [[t[:] for t in vt] for vt in routes]
                            
                            # Remove dari v1
                            removed_customer = new_routes[v1][trip1_idx].pop(cust_idx)
                            if not new_routes[v1][trip1_idx]:
                                new_routes[v1].pop(trip1_idx)
                            
                            # Insert ke v2
                            if trip2_idx >= len(new_routes[v2]):
                                new_routes[v2].append([removed_customer])
                            else:
                                trip_load = sum(demands[c] for c in new_routes[v2][trip2_idx])
                                if trip_load + demands[removed_customer] <= vehicle_list[v2]["capacity"]:
                                    new_routes[v2][trip2_idx].append(removed_customer)
                                else:
                                    continue
                            
                            if is_feasible(new_routes):
                                candidates.append(new_routes)
        
        return candidates

    def neighborhood_exchange(routes):
        """NS₃: Exchange customers antara 2 routes"""
        candidates = []
        exchange_count = 0
        max_exchanges = 50  # Limit untuk efisiensi
        
        for v1 in range(total_vehicles):
            for trip1_idx in range(len(routes[v1])):
                for cust1_idx in range(len(routes[v1][trip1_idx])):
                    
                    for v2 in range(v1+1, total_vehicles):
                        for trip2_idx in range(len(routes[v2])):
                            for cust2_idx in range(len(routes[v2][trip2_idx])):
                                if exchange_count >= max_exchanges:
                                    return candidates
                                
                                new_routes = [[t[:] for t in vt] for vt in routes]
                                
                                # Swap
                                new_routes[v1][trip1_idx][cust1_idx], new_routes[v2][trip2_idx][cust2_idx] = \
                                    new_routes[v2][trip2_idx][cust2_idx], new_routes[v1][trip1_idx][cust1_idx]
                                
                                if is_feasible(new_routes):
                                    candidates.append(new_routes)
                                    exchange_count += 1
        
        return candidates

    def local_search(routes):
        """Local search mechanism"""
        improved = True
        current = [[t[:] for t in vt] for vt in routes]
        current_cost = total_cost(current)
        
        max_no_improve = 3
        no_improve_count = 0
        
        while improved and no_improve_count < max_no_improve:
            improved = False
            
            for ns_func in [neighborhood_swap_within_route, 
                           neighborhood_relocate, 
                           neighborhood_exchange]:
                
                neighbors = ns_func(current)
                
                if not neighbors:
                    continue
                
                # Cari neighbor terbaik
                best_neighbor = None
                best_neighbor_cost = current_cost
                
                for neighbor in neighbors[:30]:  # Limit evaluasi
                    neighbor_cost = total_cost(neighbor)
                    if neighbor_cost < best_neighbor_cost:
                        best_neighbor = neighbor
                        best_neighbor_cost = neighbor_cost
                
                if best_neighbor:
                    current = [[t[:] for t in vt] for vt in best_neighbor]
                    current_cost = best_neighbor_cost
                    improved = True
                    no_improve_count = 0
                    break
                else:
                    no_improve_count += 1
        
        return current, current_cost

    # =====================
    # 5. Main SA Algorithm
    # =====================
    
    print("Constructing initial solution...")
    routes = construct_initial_solution(customers)
    
    # Validate initial solution
    assigned_customers = set()
    for vehicle_trips in routes:
        for trip in vehicle_trips:
            for customer in trip:
                if customer in assigned_customers:
                    print(f"ERROR: Customer {customer} assigned multiple times!")
                assigned_customers.add(customer)
    
    print(f"Initial solution: {len(assigned_customers)} customers assigned")
    
    print("Applying local search to initial solution...")
    S0, cost_S0 = local_search(routes)
    
    # SA initialization
    S = [[t[:] for t in vt] for vt in S0]
    S_star = [[t[:] for t in vt] for vt in S0]
    T = temp
    
    current_cost = cost_S0
    best_cost = cost_S0
    
    def count_vehicles_used(routes):
        car_count = 0
        bike_count = 0
        for i, vehicle_trips in enumerate(routes):
            if vehicle_trips and any(trip for trip in vehicle_trips):
                if vehicle_list[i]["type"].lower() == "motor":
                    bike_count += 1
                else:
                    car_count += 1
        return car_count, bike_count
    
    cars_used, bikes_used = count_vehicles_used(S_star)
    history = [{
        "iteration": 0, 
        "cost": best_cost,
        "temperature": T,
        "carsUsed": cars_used,
        "bikesUsed": bikes_used
    }]
    
    print(f"Starting SA with temp={T}, cooling={cooling}, max_iter={max_iter}")
    
    # SA Loop
    iteration = 0
    Len = 100
    L = 50
    
    while iteration < max_iter and T > 0.1:
        i = 1
        j = 1
        
        while i < Len and j < L:
            ns_func = random.choice([
                neighborhood_swap_within_route,
                neighborhood_relocate,
                neighborhood_exchange
            ])
            
            neighbors = ns_func(S)
            if not neighbors:
                j += 1
                continue
            
            S_prime = random.choice(neighbors)
            
            if is_feasible(S_prime):
                # Local search dengan probabilitas
                if random.random() < 0.2:  # 20% chance
                    S_prime_improved, cost_S_prime = local_search(S_prime)
                else:
                    S_prime_improved = S_prime
                    cost_S_prime = total_cost(S_prime)
                
                delta = cost_S_prime - current_cost
                
                if delta < 0:
                    S = [[t[:] for t in vt] for vt in S_prime_improved]
                    current_cost = cost_S_prime
                    
                    if current_cost < best_cost:
                        S_star = [[t[:] for t in vt] for vt in S]
                        best_cost = current_cost
                elif T > 0 and random.random() < math.exp(-delta / T):
                    S = [[t[:] for t in vt] for vt in S_prime_improved]
                    current_cost = cost_S_prime
            
            i += 1
            j += 1
        
        T = cooling * T
        iteration += 1
        
        if iteration % 10 == 0:
            cars_used, bikes_used = count_vehicles_used(S)
            history.append({
                "iteration": iteration,
                "cost": current_cost,
                "temperature": T,
                "carsUsed": cars_used,
                "bikesUsed": bikes_used
            })
            print(f"Iteration {iteration}: cost={current_cost:.2f}, best={best_cost:.2f}, T={T:.2f}")

    # =====================
    # 6. Format output
    # =====================
    print("Formatting output...")
    flattened_routes = []
    for vehicle_trips in S_star:
        vehicle_route = []
        for trip in vehicle_trips:
            if trip:
                vehicle_route.extend(trip)
        flattened_routes.append(vehicle_route)

    # Validasi final
    all_customers_final = []
    for route in flattened_routes:
        all_customers_final.extend(route)
    
    if len(all_customers_final) != len(set(all_customers_final)):
        print("ERROR: Duplicate customers in final solution!")
    
    print(f"Final solution: {len(flattened_routes)} routes, cost={best_cost:.2f}")

    return flattened_routes, best_cost, history, vehicle_list


# ==================================================================
# Genetic Algorithm
# ==================================================================
def genetic_algorithm(dist_car, dist_bike, demands, vehicles, pop_size, generations, mutation_rate, car_count, bike_count):
    
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
        total_distance = 0
        
        for route, v_type_code in routes_with_types:
            # 1. Determine Capacity
            current_capacity = 0
            # v_type_code 1 = Bike (motor), 0 = Car (mobil)
            target_type = "motor" if v_type_code == 1 else "mobil"
            
            # Find capacity in the vehicles list
            for v in vehicles:
                 if v["type"].lower() == target_type:
                     current_capacity = v["capacity"]
                     break
            
            # 2. Simulate the Drive (Check Capacity)
            current_load = 0
            stops = route[1:-1] # Ignore start/end depot for simulation loop
            
            if not stops: continue

            last_node = 0 
            dist_matrix = dist_bike if v_type_code == 1 else dist_car

            for customer in stops:
                demand = demands[customer]
                
                # If adding this customer exceeds capacity, go back to depot first
                if current_load + demand > current_capacity:
                    total_distance += dist_matrix[last_node][0] # Trip to depot
                    last_node = 0
                    current_load = 0 # Refill
                
                # Go to customer
                total_distance += dist_matrix[last_node][customer]
                current_load += demand
                last_node = customer
            
            # Return to depot at the end
            total_distance += dist_matrix[last_node][0]

        return total_distance

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

# TABU SEARCH
import random
import math

def tabu_search(dist, demands, vehicles, max_iter, tabu_tenure=10, theta_max=50):
    """
    Tabu Search untuk Multi-Trip VRP dengan Adaptive Memory
    
    Parameters:
    - dist: distance matrix
    - demands: customer demands
    - vehicles: vehicle configuration
    - max_iter: maximum iterations
    - tabu_tenure: tabu list size
    - theta_max: max iterations without improvement
    """
    n = len(dist)
    customers = list(range(1, n))

    # =====================
    # 1. Setup vehicles
    # =====================
    vehicle_list = []
    for v in vehicles:
        for _ in range(v["count"]):
            vehicle_list.append({
                "type": v["type"],
                "capacity": v["capacity"]
            })
    total_vehicles = len(vehicle_list)

    # =====================
    # 2. Initial Solution - Nearest Neighbor
    # =====================
    def nearest_neighbor_init(customers):
        """Construct initial solution using nearest neighbor"""
        routes = [[] for _ in range(total_vehicles)]
        unvisited = customers[:]
        
        for v_idx in range(total_vehicles):
            if not unvisited:
                break
            
            # Start from depot
            current = 0
            current_trip = []
            current_load = 0
            
            while unvisited:
                # Find nearest unvisited customer
                nearest = None
                nearest_dist = float('inf')
                
                for cust in unvisited:
                    if demands[cust] + current_load <= vehicle_list[v_idx]["capacity"]:
                        d = dist[current][cust]
                        if d < nearest_dist:
                            nearest_dist = d
                            nearest = cust
                
                if nearest is None:
                    # Current trip is full, start new trip
                    if current_trip:
                        routes[v_idx].append(current_trip)
                    current_trip = []
                    current_load = 0
                    current = 0
                    
                    # Try to fit any customer in new trip
                    for cust in unvisited:
                        if demands[cust] <= vehicle_list[v_idx]["capacity"]:
                            current_trip.append(cust)
                            current_load += demands[cust]
                            current = cust
                            unvisited.remove(cust)
                            break
                    else:
                        break
                else:
                    current_trip.append(nearest)
                    current_load += demands[nearest]
                    current = nearest
                    unvisited.remove(nearest)
            
            # Add last trip
            if current_trip:
                routes[v_idx].append(current_trip)
        
        return routes

    # =====================
    # 3. Cost Functions
    # =====================
    def trip_cost(trip):
        if not trip:
            return 0
        cost = dist[0][trip[0]]
        for i in range(len(trip)-1):
            cost += dist[trip[i]][trip[i+1]]
        cost += dist[trip[-1]][0]
        return cost

    def total_cost(routes):
        return sum(sum(trip_cost(trip) for trip in vehicle_trips) 
                   for vehicle_trips in routes)
    
    def is_feasible(routes):
        for v_idx, vehicle_trips in enumerate(routes):
            capacity = vehicle_list[v_idx]["capacity"]
            for trip in vehicle_trips:
                if sum(demands[c] for c in trip) > capacity:
                    return False
        return True

    # =====================
    # 4. Neighborhood Structures
    # =====================
    def permutation_move(routes, tabu_list):
        """Swap customers between different routes (permutation-neighbourhood)"""
        best_neighbor = None
        best_cost = float('inf')
        best_move = None
        
        for v1 in range(total_vehicles):
            for trip1_idx in range(len(routes[v1])):
                for cust1_idx in range(len(routes[v1][trip1_idx])):
                    cust1 = routes[v1][trip1_idx][cust1_idx]
                    
                    for v2 in range(v1+1, total_vehicles):
                        for trip2_idx in range(len(routes[v2])):
                            for cust2_idx in range(len(routes[v2][trip2_idx])):
                                cust2 = routes[v2][trip2_idx][cust2_idx]
                                
                                # Check if move is tabu
                                if (cust1, v2) in tabu_list or (cust2, v1) in tabu_list:
                                    continue
                                
                                # Create neighbor
                                new_routes = [[t[:] for t in vt] for vt in routes]
                                new_routes[v1][trip1_idx][cust1_idx] = cust2
                                new_routes[v2][trip2_idx][cust2_idx] = cust1
                                
                                if is_feasible(new_routes):
                                    cost = total_cost(new_routes)
                                    if cost < best_cost:
                                        best_cost = cost
                                        best_neighbor = new_routes
                                        best_move = [(cust1, v2), (cust2, v1)]
        
        return best_neighbor, best_cost, best_move

    def two_move(routes, tabu_list):
        """Move customer from one route to another (two-move)"""
        best_neighbor = None
        best_cost = float('inf')
        best_move = None
        
        for v1 in range(total_vehicles):
            for trip1_idx in range(len(routes[v1])):
                for cust_idx in range(len(routes[v1][trip1_idx])):
                    customer = routes[v1][trip1_idx][cust_idx]
                    
                    for v2 in range(total_vehicles):
                        if v2 == v1:
                            continue
                        
                        # Check if move is tabu
                        if (customer, v2) in tabu_list:
                            continue
                        
                        # Try inserting to each trip in v2
                        for trip2_idx in range(len(routes[v2]) + 1):
                            new_routes = [[t[:] for t in vt] for vt in routes]
                            
                            # Remove from v1
                            new_routes[v1][trip1_idx].pop(cust_idx)
                            if not new_routes[v1][trip1_idx]:
                                new_routes[v1].pop(trip1_idx)
                            
                            # Insert to v2
                            if trip2_idx == len(new_routes[v2]):
                                new_routes[v2].append([customer])
                            else:
                                trip_load = sum(demands[c] for c in new_routes[v2][trip2_idx])
                                if trip_load + demands[customer] <= vehicle_list[v2]["capacity"]:
                                    new_routes[v2][trip2_idx].append(customer)
                                else:
                                    continue
                            
                            if is_feasible(new_routes):
                                cost = total_cost(new_routes)
                                if cost < best_cost:
                                    best_cost = cost
                                    best_neighbor = new_routes
                                    best_move = [(customer, v2)]
        
        return best_neighbor, best_cost, best_move

    # =====================
    # 5. Improvement Procedures
    # =====================
    def exchange_vertices(routes):
        """Exchange vertices between two randomly selected routes"""
        if total_vehicles < 2:
            return routes
        
        improved = True
        current = [[t[:] for t in vt] for vt in routes]
        
        while improved:
            improved = False
            
            # Select two random routes with trips
            routes_with_trips = [i for i, r in enumerate(current) if r]
            if len(routes_with_trips) < 2:
                break
            
            v1, v2 = random.sample(routes_with_trips, 2)
            
            # Flatten trips to get all customers
            customers_v1 = [c for trip in current[v1] for c in trip]
            customers_v2 = [c for trip in current[v2] for c in trip]
            
            if not customers_v1 or not customers_v2:
                continue
            
            best_improvement = 0
            best_swap = None
            
            for i, c1 in enumerate(customers_v1):
                for j, c2 in enumerate(customers_v2):
                    # Try swap
                    test_routes = [[t[:] for t in vt] for vt in current]
                    
                    # Remove and swap
                    # This is simplified - in production, need to handle trip structure
                    old_cost = total_cost(current)
                    
                    # Create new routes with swap
                    new_v1_customers = customers_v1[:]
                    new_v2_customers = customers_v2[:]
                    new_v1_customers[i] = c2
                    new_v2_customers[j] = c1
                    
                    # Rebuild trips
                    test_routes[v1] = []
                    test_routes[v2] = []
                    
                    # Simple greedy rebuild
                    for customers, v_idx in [(new_v1_customers, v1), (new_v2_customers, v2)]:
                        trip = []
                        load = 0
                        for c in customers:
                            if load + demands[c] <= vehicle_list[v_idx]["capacity"]:
                                trip.append(c)
                                load += demands[c]
                            else:
                                if trip:
                                    test_routes[v_idx].append(trip)
                                trip = [c]
                                load = demands[c]
                        if trip:
                            test_routes[v_idx].append(trip)
                    
                    if is_feasible(test_routes):
                        new_cost = total_cost(test_routes)
                        improvement = old_cost - new_cost
                        if improvement > best_improvement:
                            best_improvement = improvement
                            best_swap = test_routes
            
            if best_swap and best_improvement > 0:
                current = best_swap
                improved = True
        
        return current

    def random_vertex_insertion(routes):
        """Random vertex removal and re-insertion"""
        if not any(routes):
            return routes
        
        current = [[t[:] for t in vt] for vt in routes]
        
        # Select random route with trips
        routes_with_trips = [i for i, r in enumerate(current) if r]
        if not routes_with_trips:
            return current
        
        v_idx = random.choice(routes_with_trips)
        
        # Get all customers from this vehicle
        all_customers = [c for trip in current[v_idx] for c in trip]
        if len(all_customers) < 2:
            return current
        
        # Randomly remove some customers (20-40%)
        num_remove = max(1, int(len(all_customers) * random.uniform(0.2, 0.4)))
        removed = random.sample(all_customers, num_remove)
        
        # Remove from route
        for trip in current[v_idx]:
            for c in removed:
                if c in trip:
                    trip.remove(c)
        
        # Remove empty trips
        current[v_idx] = [trip for trip in current[v_idx] if trip]
        
        # Re-insert greedily
        for customer in removed:
            best_position = None
            best_cost_increase = float('inf')
            
            # Try inserting in existing trips
            for trip_idx, trip in enumerate(current[v_idx]):
                trip_load = sum(demands[c] for c in trip)
                if trip_load + demands[customer] <= vehicle_list[v_idx]["capacity"]:
                    # Try at each position
                    for pos in range(len(trip) + 1):
                        if pos == 0:
                            cost_increase = dist[0][customer] + dist[customer][trip[0]] - dist[0][trip[0]]
                        elif pos == len(trip):
                            cost_increase = dist[trip[-1]][customer] + dist[customer][0] - dist[trip[-1]][0]
                        else:
                            cost_increase = dist[trip[pos-1]][customer] + dist[customer][trip[pos]] - dist[trip[pos-1]][trip[pos]]
                        
                        if cost_increase < best_cost_increase:
                            best_cost_increase = cost_increase
                            best_position = (trip_idx, pos)
            
            # Insert at best position
            if best_position:
                trip_idx, pos = best_position
                current[v_idx][trip_idx].insert(pos, customer)
            else:
                # Create new trip
                current[v_idx].append([customer])
        
        return current

    # =====================
    # 6. Tabu Search Main Loop
    # =====================
    
    # Initialize
    s_current = nearest_neighbor_init(customers)
    s_best = [[t[:] for t in vt] for vt in s_current]
    best_cost = total_cost(s_best)
    current_cost = best_cost
    
    tabu_list = set()
    theta = 0  # iterations without improvement
    
    def count_vehicles_used(routes):
        car_count = 0
        bike_count = 0
        for i, vehicle_trips in enumerate(routes):
            if vehicle_trips and any(trip for trip in vehicle_trips):
                if vehicle_list[i]["type"].lower() == "motor":
                    bike_count += 1
                else:
                    car_count += 1
        return car_count, bike_count
    
    cars_used, bikes_used = count_vehicles_used(s_best)
    history = [{
        "iteration": 0,
        "cost": best_cost,
        "temperature": 0,  # Not used in TS but kept for compatibility
        "carsUsed": cars_used,
        "bikesUsed": bikes_used
    }]
    
    iteration = 0
    
    while iteration < max_iter and theta < theta_max:
        iteration += 1
        
        # Apply neighborhood search
        neighbor_perm, cost_perm, move_perm = permutation_move(s_current, tabu_list)
        neighbor_two, cost_two, move_two = two_move(s_current, tabu_list)
        
        # Select best non-tabu neighbor
        if neighbor_perm and neighbor_two:
            if cost_perm < cost_two:
                s_current = neighbor_perm
                current_cost = cost_perm
                best_moves = move_perm
            else:
                s_current = neighbor_two
                current_cost = cost_two
                best_moves = move_two
        elif neighbor_perm:
            s_current = neighbor_perm
            current_cost = cost_perm
            best_moves = move_perm
        elif neighbor_two:
            s_current = neighbor_two
            current_cost = cost_two
            best_moves = move_two
        else:
            # No feasible move found
            theta += 1
            if iteration % 5 == 0:
                cars_used, bikes_used = count_vehicles_used(s_current)
                history.append({
                    "iteration": iteration,
                    "cost": current_cost,
                    "temperature": 0,
                    "carsUsed": cars_used,
                    "bikesUsed": bikes_used
                })
            continue
        
        # Update tabu list
        if best_moves:
            for move in best_moves:
                tabu_list.add(move)
            
            # Maintain tabu list size
            if len(tabu_list) > tabu_tenure:
                tabu_list.pop()
        
        # Apply improvement procedures
        s_current = exchange_vertices(s_current)
        s_current = random_vertex_insertion(s_current)
        current_cost = total_cost(s_current)
        
        # Update best solution
        if current_cost < best_cost:
            s_best = [[t[:] for t in vt] for vt in s_current]
            best_cost = current_cost
            theta = 0  # Reset counter
        else:
            theta += 1
        
        # Log progress
        if iteration % 5 == 0:
            cars_used, bikes_used = count_vehicles_used(s_current)
            history.append({
                "iteration": iteration,
                "cost": current_cost,
                "temperature": 0,
                "carsUsed": cars_used,
                "bikesUsed": bikes_used
            })

    # =====================
    # 7. Format output
    # =====================
    flattened_routes = []
    for vehicle_trips in s_best:
        vehicle_route = []
        for trip in vehicle_trips:
            if trip:
                vehicle_route.extend(trip)
                vehicle_route.append(0)
        if vehicle_route and vehicle_route[-1] == 0:
            vehicle_route.pop()
        flattened_routes.append(vehicle_route)

    return flattened_routes, best_cost, history, vehicle_list

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
            locations = data["locations"]
            params = data["params"]

            # demands
            demands = [0] + [loc.get("demand", 0) for loc in locations[1:]]

            # vehicles list
            vehicles = params["vehicles"]
            max_iter = params.get("maxIterations", 500)

            best_routes, best_cost, history, vehicle_list = hill_climbing(
                dist_car,
                demands,
                vehicles,
                max_iter
            )

            # ============================
            # SAMAKAN FORMAT DENGAN GENETIC
            # ============================

            vehicle_routes = []
            vehicle_paths = []
            vehicle_types = []

            for idx, route in enumerate(best_routes):
                vtype = vehicle_list[idx]["type"]
                vehicle_types.append(vtype)

                # Tambahkan depot depan-belakang (SAMA seperti GA)
                full_route = [0] + route + [0]

                # Kirim lokasi lengkap
                route_locations = [locations[i] for i in full_route]
                vehicle_routes.append(route_locations)

                # Tentukan method OSRM
                method = ROUTE_METHOD.BIKE if vtype.lower() == "motor" else ROUTE_METHOD.CAR
                
                # Bangun path
                path = []
                for i in range(len(full_route) - 1):
                    p1 = locations[full_route[i]]
                    p2 = locations[full_route[i + 1]]
                    path.extend(osrm_route_path(p1, p2, method))

                vehicle_paths.append(path)

            return jsonify({
                "algorithm": "hill-climbing",
                "vehicleRoutes": vehicle_routes,
                "vehiclePaths": vehicle_paths,
                "vehicleTypes": vehicle_types,
                "finalCost": best_cost,
                "history": history,
                "totalVehicles": len(vehicle_routes)
            })

        elif algorithm == "simulated-annealing":
            locations = data["locations"]
            params = data["params"]
            
            # Extract demands
            demands = [0] + [loc.get("demand", 0) for loc in locations[1:]]
            
            # Extract vehicles list
            vehicles = params["vehicles"]
            
            # ✅ EXTRACT SEMUA PARAMETER SA (yang dikirim dari frontend)
            max_iter = params.get("maxIterations", 500)
            initial_temp = params.get("initialTemp", 1000)
            cooling_rate = params.get("coolingRate", 0.995)
            
            print(f"SA Parameters: maxIter={max_iter}, temp={initial_temp}, cooling={cooling_rate}")
            
            # ✅ PANGGIL DENGAN 6 PARAMETER LENGKAP
            best_routes, best_cost, history, vehicle_list = simulated_annealing_mv(
                dist_car,
                dist_bike,# 1. distance matrix
                demands,        # 2. demands
                vehicles,       # 3. vehicles config
                max_iter,       # 4. max iterations
                initial_temp,   # 5. initial temperature ⚠️ YANG KURANG INI
                cooling_rate    # 6. cooling rate ⚠️ YANG KURANG INI
            )
            
            # Format output (sama dengan genetic algorithm)
            vehicle_routes = []
            vehicle_paths = []
            vehicle_types = []
            
            for idx, route in enumerate(best_routes):
                # Skip empty routes
                if not route:
                    continue
                    
                vtype = vehicle_list[idx]["type"]
                vehicle_types.append(vtype)
                
                # Tambahkan depot depan-belakang
                full_route = [0] + route + [0]
                
                # Kirim lokasi lengkap
                route_locations = [locations[i] for i in full_route]
                vehicle_routes.append(route_locations)
                
                # Tentukan method OSRM
                method = ROUTE_METHOD.BIKE if vtype.lower() == "motor" else ROUTE_METHOD.CAR
                
                # Bangun path
                path = []
                for i in range(len(full_route) - 1):
                    p1 = locations[full_route[i]]
                    p2 = locations[full_route[i + 1]]
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
                # ✅ TAMBAHAN: Info parameter yang digunakan
                "parameters": {
                    "initialTemp": initial_temp,
                    "coolingRate": cooling_rate,
                    "maxIterations": max_iter
                }
            })
        
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
        elif algorithm == "tabu-search":
            locations = data["locations"]
            params = data["params"]

            # demands
            demands = [0] + [loc.get("demand", 0) for loc in locations[1:]]

            # vehicles list
            vehicles = params["vehicles"]
            max_iter = params.get("maxIterations", 500)

            best_routes, best_cost, history, vehicle_list = tabu_search(
                dist_car,
                demands,
                vehicles,
                max_iter
            )

            # ============================
            # SAMAKAN FORMAT DENGAN GENETIC
            # ============================

            vehicle_routes = []
            vehicle_paths = []
            vehicle_types = []

            for idx, route in enumerate(best_routes):
                vtype = vehicle_list[idx]["type"]
                vehicle_types.append(vtype)

                # Tambahkan depot depan-belakang (SAMA seperti GA)
                full_route = [0] + route + [0]

                # Kirim lokasi lengkap
                route_locations = [locations[i] for i in full_route]
                vehicle_routes.append(route_locations)

                # Tentukan method OSRM
                method = ROUTE_METHOD.BIKE if vtype.lower() == "motor" else ROUTE_METHOD.CAR
                
                # Bangun path
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
            
        else:
            return jsonify({"error": "Algorithm Not Found"}), 400
    
    else:
        return jsonify({"error": "No valid input data"}), 400
    

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