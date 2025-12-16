import random

def solve_tabu_search(dist_car, dist_bike, demands, vehicles, max_iter=500, tabu_tenure=10):
    """
    Tabu Search Logic for Single-Trip Heterogeneous VRP.
    Setiap kendaraan hanya melakukan 1 trip (Depot -> Cust... -> Depot).
    """
    
    # --- 1. SETUP DATA ---
    n_location = len(dist_car)
    customers = list(range(1, n_location))
    
    # Flatten vehicles list (memecah count > 1 menjadi instance individu)
    vehicle_instances = []
    for v in vehicles:
        for _ in range(v["count"]):
            vehicle_instances.append({
                "type": v["type"],
                "capacity": v["capacity"],
                # Pilih matriks jarak sesuai tipe kendaraan
                "matrix": dist_bike if v["type"].lower() in ["motor", "bike"] else dist_car
            })
    
    total_vehicles = len(vehicle_instances)
    if total_vehicles == 0:
        return [], 0, [], vehicle_instances

    # --- 2. COST FUNCTIONS ---
    def calculate_route_cost(route, matrix):
        if not route: return 0
        # Depot -> Cust 1
        cost = matrix[0][route[0]] 
        # Cust i -> Cust i+1
        for i in range(len(route) - 1):
            cost += matrix[route[i]][route[i+1]]
        # Cust Last -> Depot
        cost += matrix[route[-1]][0] 
        return cost

    def calculate_total_cost(solution):
        total_dist = 0
        penalty = 0
        
        for v_idx, route in enumerate(solution):
            if not route: continue
            
            matrix = vehicle_instances[v_idx]["matrix"]
            capacity = vehicle_instances[v_idx]["capacity"]
            
            # Hitung jarak
            total_dist += calculate_route_cost(route, matrix)
            
            # Hitung penalty kapasitas
            load = sum(demands[c] for c in route)
            if load > capacity:
                # Penalty multiplier besar agar solusi infeasible dihindari
                penalty += (load - capacity) * 10000 
                
        return total_dist + penalty

    # --- 3. INITIAL SOLUTION (Greedy) ---
    def generate_initial_solution():
        sol = [[] for _ in range(total_vehicles)]
        unassigned = customers[:]
        random.shuffle(unassigned)
        
        for cust in unassigned:
            best_v = -1
            best_insertion_cost = float('inf')
            
            # Coba masukkan ke setiap kendaraan yang muat
            for v_idx in range(total_vehicles):
                current_load = sum(demands[c] for c in sol[v_idx])
                if current_load + demands[cust] <= vehicle_instances[v_idx]["capacity"]:
                    # Simple check: cost jika ditaruh di akhir
                    matrix = vehicle_instances[v_idx]["matrix"]
                    if not sol[v_idx]:
                        cost_increase = matrix[0][cust]
                    else:
                        last = sol[v_idx][-1]
                        cost_increase = matrix[last][cust]
                    
                    if cost_increase < best_insertion_cost:
                        best_insertion_cost = cost_increase
                        best_v = v_idx
            
            if best_v != -1:
                sol[best_v].append(cust)
            else:
                # Jika tidak muat di mana pun, taruh random (akan kena penalty)
                v_random = random.randint(0, total_vehicles - 1)
                sol[v_random].append(cust)
        return sol

    # --- 4. MAIN TABU LOOP ---
    current_solution = generate_initial_solution()
    best_solution = [r[:] for r in current_solution]
    best_cost = calculate_total_cost(best_solution)
    
    tabu_list = [] 
    history = [{"iteration": 0, "cost": best_cost}]

    for it in range(max_iter):
        neighbors = []
        
        # Sampling neighbors (Batasi jumlah sample untuk performa)
        # Kita gunakan 2 jenis move: RELOCATE dan SWAP
        for _ in range(200): 
            candidate = [r[:] for r in current_solution]
            move_type = random.choice(['relocate', 'swap'])
            move_signature = None
            
            if move_type == 'relocate':
                # Pindahkan customer dari v_src ke v_dst
                v_src = random.randint(0, total_vehicles - 1)
                if not candidate[v_src]: continue
                
                c_idx = random.randint(0, len(candidate[v_src]) - 1)
                cust = candidate[v_src].pop(c_idx)
                
                v_dst = random.randint(0, total_vehicles - 1)
                # Insert di posisi random
                if not candidate[v_dst]:
                    candidate[v_dst].append(cust)
                else:
                    pos = random.randint(0, len(candidate[v_dst]))
                    candidate[v_dst].insert(pos, cust)
                
                move_signature = ('relocate', cust, v_src, v_dst)

            elif move_type == 'swap':
                # Tukar customer antar rute atau dalam rute sama
                v1 = random.randint(0, total_vehicles - 1)
                v2 = random.randint(0, total_vehicles - 1)
                
                if not candidate[v1] or not candidate[v2]: continue
                
                idx1 = random.randint(0, len(candidate[v1])-1)
                idx2 = random.randint(0, len(candidate[v2])-1)
                
                candidate[v1][idx1], candidate[v2][idx2] = candidate[v2][idx2], candidate[v1][idx1]
                
                c1 = candidate[v1][idx1] # Customer baru di v1
                c2 = candidate[v2][idx2] # Customer baru di v2
                move_signature = ('swap', c1, c2)

            if move_signature:
                cost = calculate_total_cost(candidate)
                neighbors.append((cost, candidate, move_signature))
        
        # Urutkan neighbor berdasarkan cost terendah
        neighbors.sort(key=lambda x: x[0])
        
        found_move = False
        for cost, cand, move in neighbors:
            is_tabu = move in tabu_list
            
            # Aspiration criteria: kalau cost lebih baik dari global best, abaikan status tabu
            if (not is_tabu) or (cost < best_cost):
                current_solution = cand
                found_move = True
                
                # Masukkan ke tabu list
                tabu_list.append(move)
                if len(tabu_list) > tabu_tenure:
                    tabu_list.pop(0)
                
                # Update Best Global
                if cost < best_cost:
                    best_cost = cost
                    best_solution = [r[:] for r in cand]
                break
        
        # Logging
        if (it + 1) % 10 == 0 or it == max_iter - 1:
            history.append({"iteration": it + 1, "cost": best_cost})

    return best_solution, best_cost, history, vehicle_instances