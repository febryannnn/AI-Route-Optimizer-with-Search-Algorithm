import random
import math
import copy

def simulated_annealing(dist_car, dist_bike, demands, vehicles, max_iter, temp, cooling):
    
    n = len(demands)
    customers = list(range(1, n)) 
    
    # buat list vehicles berdasarkan id, jadi misal ada 2 mobil 1 motor maka:
    # mobil 1, mobil 2, motor 3
    vehicle_list = []
    for v in vehicles:
        for _ in range(v["count"]):
            vehicle_list.append({
                "type": v["type"],
                "capacity": v["capacity"]
            })
    
    # buat initial solution dengan nearest neighbor heuristic
    def nearest_neighbor_init():
        routes = [[] for _ in vehicle_list]
        remaining = set(customers)
        
        for v_idx, vehicle in enumerate(vehicle_list):
            if not remaining:
                break
                
            current_load = 0
            current_pos = 0
            route = []
            
            while remaining:
                
                best_customer = None
                best_dist = float('inf')
                
                dist_matrix = dist_bike if vehicle["type"].lower() == "motor" else dist_car
                
                for customer in remaining:
                    if current_load + demands[customer] <= vehicle["capacity"]:
                        dist = dist_matrix[current_pos][customer]
                        if dist < best_dist:
                            best_dist = dist
                            best_customer = customer
                
                if best_customer is None:
                    break
                
                route.append(best_customer)
                current_load += demands[best_customer]
                current_pos = best_customer
                remaining.remove(best_customer)
            
            routes[v_idx] = route
        
        return routes

    def calculate_cost(routes):
        total_cost = 0
        bikes_used = 0
        cars_used = 0
        
        for v_idx, route in enumerate(routes):
            if not route:
                continue
            
            vehicle = vehicle_list[v_idx]
            dist_matrix = dist_bike if vehicle["type"].lower() == "motor" else dist_car
            
            if vehicle["type"].lower() == "motor":
                bikes_used += 1
            else:
                cars_used += 1
            
            # Cost dari depot ke customer pertama
            route_cost = dist_matrix[0][route[0]]
            
            # Cost antar customer
            for i in range(len(route) - 1):
                route_cost += dist_matrix[route[i]][route[i + 1]]
            
            # Cost dari customer terakhir kembali ke depot
            route_cost += dist_matrix[route[-1]][0]
            
            total_cost += route_cost
        
        return total_cost, bikes_used, cars_used
    
    def is_valid(routes):
        for v_idx, route in enumerate(routes):
            vehicle = vehicle_list[v_idx]
            load = sum(demands[customer] for customer in route)
            if load > vehicle["capacity"]:
                return False
        return True
    
    def get_neighbor(routes):
        new_routes = copy.deepcopy(routes)
        
        # Get non-empty routes
        non_empty = [i for i, r in enumerate(new_routes) if r]
        
        if not non_empty:
            return new_routes
        
        
        # pilihan neighbor structur :
        # 1. swap : tukar dua customer dalam satu rute
        # 2. relocate : pindah satu customer ke rute lain
        # 3. two_opt : reverse tiap customer dari ujung kiri -> ujung kanan
        # 4. cross_exchange : tuker segmen antar 2 rute
        
        operation = random.choice(['swap', 'relocate', 'two_opt', 'cross_exchange'])
        
        if operation == 'swap' and len(non_empty) >= 1:
            route_idx = random.choice(non_empty)
            route = new_routes[route_idx]
            if len(route) >= 2:
                i, j = random.sample(range(len(route)), 2)
                route[i], route[j] = route[j], route[i]
        
        elif operation == 'relocate' and len(non_empty) >= 1:
            # pindah customer ke rute lain
            from_idx = random.choice(non_empty)
            from_route = new_routes[from_idx]
            
            if from_route:
                # ambil index customer random
                cust_idx = random.randint(0, len(from_route) - 1)
                customer = from_route.pop(cust_idx)
                
                # ambil index rute tujuan
                to_idx = random.randint(0, len(new_routes) - 1)
                to_route = new_routes[to_idx]
                
                # cek kapasitas dulu sebelum insert
                vehicle = vehicle_list[to_idx]
                current_load = sum(demands[c] for c in to_route)
                
                if current_load + demands[customer] <= vehicle["capacity"]:
                    if to_route:
                        insert_pos = random.randint(0, len(to_route))
                        to_route.insert(insert_pos, customer)
                    else:
                        to_route.append(customer)
                else:
                    # kembalikan ke rute asal kalo ga muat
                    from_route.insert(cust_idx, customer)
        
        elif operation == 'two_opt' and len(non_empty) >= 1:
            # reverse segmen dalam satu rute (ujung kiri ke ujung kanan)
            route_idx = random.choice(non_empty)
            route = new_routes[route_idx]
            if len(route) >= 2:
                i, j = sorted(random.sample(range(len(route)), 2))
                route[i:j+1] = reversed(route[i:j+1])
        
        elif operation == 'cross_exchange' and len(non_empty) >= 2:
            # tuker segmen antar 2 rute, segmen itu beberapa customer
            route1_idx, route2_idx = random.sample(non_empty, 2)
            route1 = new_routes[route1_idx]
            route2 = new_routes[route2_idx]
            
            if route1 and route2:
                # pilih segmen random (minimal 2 customer)
                seg1_len = random.randint(1, min(2, len(route1)))
                seg2_len = random.randint(1, min(2, len(route2)))
                
                seg1_start = random.randint(0, len(route1) - seg1_len)
                seg2_start = random.randint(0, len(route2) - seg2_len)
                
                seg1 = route1[seg1_start:seg1_start + seg1_len]
                seg2 = route2[seg2_start:seg2_start + seg2_len]
                
                # buat rute baru dengan segmen ditukar
                new_route1 = route1[:seg1_start] + seg2 + route1[seg1_start + seg1_len:]
                new_route2 = route2[:seg2_start] + seg1 + route2[seg2_start + seg2_len:]
                
                # cek kapasitas sebelum diterapkan
                v1_cap = vehicle_list[route1_idx]["capacity"]
                v2_cap = vehicle_list[route2_idx]["capacity"]
                
                load1 = sum(demands[c] for c in new_route1)
                load2 = sum(demands[c] for c in new_route2)
                
                if load1 <= v1_cap and load2 <= v2_cap:
                    new_routes[route1_idx] = new_route1
                    new_routes[route2_idx] = new_route2
        
        return new_routes
    
    def local_search(routes, num_candidates=10):
        # buat beberapa kandidat tetangga dan pilih yang terbaik
        best_candidate = routes
        best_candidate_cost = float('inf')
        
        for _ in range(num_candidates):
            candidate = get_neighbor(routes)
            
            if not is_valid(candidate):
                continue
            
            candidate_cost, _, _ = calculate_cost(candidate)
            
            if candidate_cost < best_candidate_cost:
                best_candidate = candidate
                best_candidate_cost = candidate_cost
        
        return best_candidate, best_candidate_cost
    
    def variable_neighborhood_search(routes, max_no_improve=5):
        current = copy.deepcopy(routes)
        current_cost, _, _ = calculate_cost(current)
        no_improve = 0
        
        while no_improve < max_no_improve:
            improved = False
            
            operations = ['swap', 'relocate', 'two_opt', 'cross_exchange']
            
            for operation in operations:
                # generate neighbornya urut iteratif berdasarkan operation
                best_neighbor = current
                best_neighbor_cost = current_cost
                
                for _ in range(5):  # coba 5 neighbor tiap 1 operasi
                    neighbor = copy.deepcopy(current)
                    non_empty = [i for i, r in enumerate(neighbor) if r]
                    
                    if not non_empty:
                        continue
                    
                    # if-else condition untuk tiap operasi
                    if operation == 'swap' and len(non_empty) >= 1:
                        route_idx = random.choice(non_empty)
                        route = neighbor[route_idx]
                        if len(route) >= 2:
                            i, j = random.sample(range(len(route)), 2)
                            route[i], route[j] = route[j], route[i]
                    
                    elif operation == 'relocate' and len(non_empty) >= 1:
                        from_idx = random.choice(non_empty)
                        from_route = neighbor[from_idx]
                        if from_route:
                            cust_idx = random.randint(0, len(from_route) - 1)
                            customer = from_route.pop(cust_idx)
                            to_idx = random.randint(0, len(neighbor) - 1)
                            to_route = neighbor[to_idx]
                            vehicle = vehicle_list[to_idx]
                            current_load = sum(demands[c] for c in to_route)
                            if current_load + demands[customer] <= vehicle["capacity"]:
                                if to_route:
                                    insert_pos = random.randint(0, len(to_route))
                                    to_route.insert(insert_pos, customer)
                                else:
                                    to_route.append(customer)
                            else:
                                from_route.insert(cust_idx, customer)
                    
                    elif operation == 'two_opt' and len(non_empty) >= 1:
                        route_idx = random.choice(non_empty)
                        route = neighbor[route_idx]
                        if len(route) >= 2:
                            i, j = sorted(random.sample(range(len(route)), 2))
                            route[i:j+1] = reversed(route[i:j+1])
                    
                    elif operation == 'cross_exchange' and len(non_empty) >= 2:
                        route1_idx, route2_idx = random.sample(non_empty, 2)
                        route1 = neighbor[route1_idx]
                        route2 = neighbor[route2_idx]
                        if route1 and route2:
                            seg1_len = random.randint(1, min(2, len(route1)))
                            seg2_len = random.randint(1, min(2, len(route2)))
                            seg1_start = random.randint(0, len(route1) - seg1_len)
                            seg2_start = random.randint(0, len(route2) - seg2_len)
                            seg1 = route1[seg1_start:seg1_start + seg1_len]
                            seg2 = route2[seg2_start:seg2_start + seg2_len]
                            new_route1 = route1[:seg1_start] + seg2 + route1[seg1_start + seg1_len:]
                            new_route2 = route2[:seg2_start] + seg1 + route2[seg2_start + seg2_len:]
                            v1_cap = vehicle_list[route1_idx]["capacity"]
                            v2_cap = vehicle_list[route2_idx]["capacity"]
                            load1 = sum(demands[c] for c in new_route1)
                            load2 = sum(demands[c] for c in new_route2)
                            if load1 <= v1_cap and load2 <= v2_cap:
                                neighbor[route1_idx] = new_route1
                                neighbor[route2_idx] = new_route2
                    
                    if not is_valid(neighbor):
                        continue
                    
                    neighbor_cost, _, _ = calculate_cost(neighbor)
                    
                    if neighbor_cost < best_neighbor_cost:
                        best_neighbor = neighbor
                        best_neighbor_cost = neighbor_cost
                
                # jika ada improvement maka no improbe direset
                if best_neighbor_cost < current_cost:
                    current = best_neighbor
                    current_cost = best_neighbor_cost
                    improved = True
                    no_improve = 0
                    break
            
            # setiap gaada improve maka ditambah 1, ini untuk menghindari loop terus (infinite loop)
            if not improved:
                no_improve += 1
        
        return current, current_cost
    
    # FUNGSI UTAMA (JALANNYA ALGORITMA SA)
    current_routes = nearest_neighbor_init()
    current_cost, bikes, cars = calculate_cost(current_routes)
    
    best_routes = copy.deepcopy(current_routes)
    best_cost = current_cost
    
    history = []
    current_temp = temp
    
    # untuk optimization progress di frontend nantinya
    history.append({
        "iteration": 0,
        "cost": current_cost,
        "temperature": current_temp,
        "bikesUsed": bikes,
        "carsUsed": cars
    })
    
    # MAIN SA LOOP
    for iteration in range(1, max_iter + 1):
        # gunakan local search untuk cari neighbor terbaik
        # dengan jumlah kandidat tergantung temperatur
        # temperatur tinggi = eksplorasi lebih banyak (lebih banyak kandidat)
        # temperatur rendah = eksploitasi (lebih sedikit kandidat)
        # loop berhenti ketika suhu < 0.01, tapi kita batasi juga dengan max_iter
        num_candidates = int(5 + (15 * (1 - current_temp / temp)))
        new_routes, new_cost = local_search(current_routes, num_candidates)
        
        # hitung delta cost (cost baru - cost lama)
        delta = new_cost - current_cost
        
        if delta < 0:
            # langsun terima, karena solusi baru lebih baik
            accept = True
        else:
            # cek dengan probabilitas
            prob = math.exp(-delta / current_temp)
            accept = random.random() < prob
        
        if accept:
            current_routes = new_routes
            current_cost = new_cost
            new_bikes, new_cars = calculate_cost(current_routes)[1:]
            
            # update solusi terbaik
            if current_cost < best_cost:
                best_routes = copy.deepcopy(current_routes)
                best_cost = current_cost
                
                # jalankan VNS
                if iteration % 50 == 0:
                    improved_routes, improved_cost = variable_neighborhood_search(best_routes)
                    if improved_cost < best_cost:
                        best_routes = improved_routes
                        best_cost = improved_cost
        else:
            new_bikes, new_cars = bikes, cars
        
        # history hanya di update setiap 5 iterasi untuk mengurangi ukuran data
        if iteration % 5 == 0:
            history.append({
                "iteration": iteration,
                "cost": current_cost,
                "temperature": current_temp,
                "bikesUsed": new_bikes,
                "carsUsed": new_cars
            })
        
        # turunkan suhu, temp = temp * cooling_rate
        current_temp *= cooling
    
    # VNS terakhir
    final_routes, final_cost = variable_neighborhood_search(best_routes, max_no_improve=10)
    if final_cost < best_cost:
        best_routes = final_routes
        best_cost = final_cost
    
    return best_routes, best_cost, history, vehicle_list