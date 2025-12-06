"""
# siapapun yang ngerjain app.py tolong masukin 
#... (setelah blok if/elif lainnya) ...

        elif algorithm == "tabu-search":
            locations = data["locations"]
            params = data["params"]

            # 1. Siapkan Demands (Sama seperti HC/SA)
            demands = [0] + [loc.get("demand", 0) for loc in locations[1:]]

            # 2. Ambil parameter Vehicles
            vehicles = params["vehicles"]
            max_iter = params.get("maxIterations", 500)

            # 3. Panggil fungsi Tabu Search
            best_routes, best_cost, history, vehicle_list = solve_tabu_search(
                dist_car,
                dist_bike,
                demands,
                vehicles,
                max_iter
            )

            # 4. Format Output (Sama persis dengan HC/SA agar Frontend bisa baca)
            vehicle_routes = []
            vehicle_paths = []
            vehicle_types = []

            for idx, route in enumerate(best_routes):
                # Pastikan index tidak melebihi vehicle_list (safety check)
                if idx < len(vehicle_list):
                    vtype = vehicle_list[idx]["type"]
                else:
                    vtype = "unknown"
                
                vehicle_types.append(vtype)

                # Tambahkan depot depan-belakang (0 -> rute -> 0)
                full_route = [0] + route + [0]

                # Konversi index ke objek lokasi lengkap
                route_locations = [locations[i] for i in full_route]
                vehicle_routes.append(route_locations)

                # Tentukan metode OSRM (Mobil vs Motor)
                method = ROUTE_METHOD.BIKE if vtype.lower() == "motor" else ROUTE_METHOD.CAR
                
                # Bangun path koordinat untuk garis peta
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
"""
import random

def solve_tabu_search(dist_car, dist_bike, demands, vehicles, max_iter=500):
    """
    Adaptive Tabu Search untuk Multi-Trip CVRP.
    Menggantikan Hill Climbing dengan memori jangka pendek (Tabu List).
    """
    
    # --- 1. SETUP DATA & HELPER FUNCTIONS ---
    n_location = len(dist_car)
    customers = list(range(1, n_location))
    
    # Flatten vehicles list untuk kemudahan akses
    vehicle_list = []
    for v in vehicles:
        for _ in range(v["count"]):
            vehicle_list.append({
                "type": v["type"],
                "capacity": v["capacity"],
                "matrix": dist_bike if v["type"].lower() == "motor" else dist_car
            })
    total_vehicles = len(vehicle_list)

    def calculate_route_cost(route, matrix):
        cost = 0
        if not route: return 0
        # Depot -> First Customer
        cost += matrix[0][route[0]]
        # Customer -> Customer
        for i in range(len(route) - 1):
            cost += matrix[route[i]][route[i+1]]
        # Last Customer -> Depot
        cost += matrix[route[-1]][0]
        return cost

    def calculate_total_cost(solution):
        total = 0
        for v_idx, trips in enumerate(solution):
            matrix = vehicle_list[v_idx]["matrix"]
            for trip in trips:
                total += calculate_route_cost(trip, matrix)
        return total

    def is_feasible(solution):
        for v_idx, trips in enumerate(solution):
            limit = vehicle_list[v_idx]["capacity"]
            for trip in trips:
                load = sum(demands[c] for c in trip)
                if load > limit:
                    return False
        return True

    def generate_initial_solution():
        # Greedy initialization (sama seperti HC agar start point bagus)
        sol = [[] for _ in range(total_vehicles)]
        unassigned = customers[:]
        random.shuffle(unassigned)
        
        for cust in unassigned:
            assigned = False
            for v_idx in range(total_vehicles):
                limit = vehicle_list[v_idx]["capacity"]
                # Coba masukkan ke trip terakhir
                if sol[v_idx]:
                    last_trip = sol[v_idx][-1]
                    current_load = sum(demands[c] for c in last_trip)
                    if current_load + demands[cust] <= limit:
                        last_trip.append(cust)
                        assigned = True
                        break
                # Jika tidak muat, buat trip baru
                if not sol[v_idx] or not assigned:
                     # Cek apakah demand customer > kapasitas kendaraan (kasus edge case)
                    if demands[cust] <= limit:
                        sol[v_idx].append([cust])
                        assigned = True
                        break
            
            # Jika tidak ada kendaraan yang muat (misal barang terlalu besar), force assign (akan di-filter nanti atau dianggap infeasible)
            if not assigned:
                # Fallback: assign ke kendaraan pertama dengan trip baru
                sol[0].append([cust])
                
        return sol

    # --- 2. TABU SEARCH PARAMETERS ---
    current_solution = generate_initial_solution()
    best_solution = [ [trip[:] for trip in v_trips] for v_trips in current_solution ]
    best_cost = calculate_total_cost(best_solution)
    
    tabu_list = [] # Menyimpan "move signature"
    tabu_tenure = 10 # Ukuran memori awal
    max_tabu_tenure = 30
    min_tabu_tenure = 5
    
    no_improvement_iter = 0
    history = []

    # --- 3. MAIN LOOP ---
    for it in range(max_iter):
        neighbors = []
        
        # --- GENERATE NEIGHBORS (Moves) ---
        # Kita generate beberapa neighbor acak untuk efisiensi (Stochastic Hill Climbing style inside Tabu)
        # Move Types: 1. Move Customer, 2. Swap Customers
        
        for _ in range(50): # Cek 50 neighbor per iterasi
            candidate = [ [trip[:] for trip in v_trips] for v_trips in current_solution ]
            move_signature = None
            
            move_type = random.choice(['move', 'swap'])
            
            if move_type == 'move':
                # Pindahkan cust C dari Vehicle A ke Vehicle B
                v_src = random.randint(0, total_vehicles - 1)
                if not candidate[v_src]: continue
                
                t_src = random.randint(0, len(candidate[v_src]) - 1)
                if not candidate[v_src][t_src]: continue
                
                c_idx = random.randint(0, len(candidate[v_src][t_src]) - 1)
                cust = candidate[v_src][t_src].pop(c_idx)
                if not candidate[v_src][t_src]: candidate[v_src].pop(t_src) # Hapus trip kosong
                
                v_dst = random.randint(0, total_vehicles - 1)
                # Logic: Insert ke trip yang muat atau buat trip baru
                placed = False
                for t_idx, trip in enumerate(candidate[v_dst]):
                    if sum(demands[c] for c in trip) + demands[cust] <= vehicle_list[v_dst]["capacity"]:
                        trip.append(cust)
                        placed = True
                        break
                if not placed:
                    candidate[v_dst].append([cust])
                
                move_signature = ('move', cust, v_src, v_dst)

            elif move_type == 'swap':
                # Tukar customer antar rute
                v1, v2 = random.sample(range(total_vehicles), 2)
                if not candidate[v1] or not candidate[v2]: continue
                
                t1 = random.randint(0, len(candidate[v1])-1)
                t2 = random.randint(0, len(candidate[v2])-1)
                
                if not candidate[v1][t1] or not candidate[v2][t2]: continue
                
                c1_idx = random.randint(0, len(candidate[v1][t1])-1)
                c2_idx = random.randint(0, len(candidate[v2][t2])-1)
                
                cust1 = candidate[v1][t1][c1_idx]
                cust2 = candidate[v2][t2][c2_idx]
                
                # Cek kapasitas sebelum swap
                load1 = sum(demands[c] for c in candidate[v1][t1]) - demands[cust1] + demands[cust2]
                load2 = sum(demands[c] for c in candidate[v2][t2]) - demands[cust2] + demands[cust1]
                
                if load1 <= vehicle_list[v1]["capacity"] and load2 <= vehicle_list[v2]["capacity"]:
                    candidate[v1][t1][c1_idx] = cust2
                    candidate[v2][t2][c2_idx] = cust1
                    move_signature = ('swap', cust1, cust2)
            
            if move_signature and is_feasible(candidate):
                cost = calculate_total_cost(candidate)
                neighbors.append((cost, candidate, move_signature))
        
        # --- SELECT BEST NEIGHBOR (Tabu Logic) ---
        neighbors.sort(key=lambda x: x[0]) # Sort by cost ascending
        
        best_neighbor = None
        best_neighbor_move = None
        
        for cost, cand, move in neighbors:
            is_tabu = move in tabu_list
            is_aspiration = cost < best_cost # Aspiration Criteria: Kalau mecahin rekor, abaikan tabu
            
            if (not is_tabu) or is_aspiration:
                best_neighbor = cand
                best_neighbor_move = move
                current_solution = cand
                break # Ambil yang terbaik yang valid
        
        # --- UPDATE MEMORY & ADAPTIVE LOGIC ---
        if best_neighbor:
            # Update Tabu List
            tabu_list.append(best_neighbor_move)
            if len(tabu_list) > tabu_tenure:
                tabu_list.pop(0)
            
            # Update Global Best
            curr_cost = calculate_total_cost(current_solution)
            if curr_cost < best_cost:
                best_solution = [ [trip[:] for trip in v_trips] for v_trips in current_solution ]
                best_cost = curr_cost
                no_improvement_iter = 0
                # Intensification: Kurangi tenure agar search lebih lokal
                tabu_tenure = max(min_tabu_tenure, tabu_tenure - 1)
            else:
                no_improvement_iter += 1
                # Diversification: Perbesar tenure agar tidak bolak-balik
                if no_improvement_iter > 10:
                    tabu_tenure = min(max_tabu_tenure, tabu_tenure + 1)
        
        # Logging history (tiap 5 iterasi)
        if it % 5 == 0:
            history.append({
                "iteration": it,
                "cost": best_cost,
                "tenure": tabu_tenure # Optional: untuk melihat adaptivitas
            })

    # --- 4. FORMAT OUTPUT (Flattening for Frontend) ---
    final_routes = []
    final_vehicle_types = []
    
    for v_idx, trips in enumerate(best_solution):
        v_type = vehicle_list[v_idx]["type"]
        final_vehicle_types.append(v_type)
        
        # Gabungkan semua trip menjadi satu list panjang dengan '0' (depot) di antaranya
        flat_route = [0]
        for trip in trips:
            flat_route.extend(trip)
            flat_route.append(0)
        
        # Hapus 0 ganda jika ada (0, 0)
        clean_route = [flat_route[0]]
        for i in range(1, len(flat_route)):
            if flat_route[i] != 0 or flat_route[i-1] != 0:
                clean_route.append(flat_route[i])
                
        final_routes.append(clean_route)

    return final_routes, best_cost, history, vehicle_list