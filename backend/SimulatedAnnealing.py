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
                        restart_needed = True
                        break  # reset

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

    # Hitung distance cost
    def trip_cost(trip, vehicle_idx):
        if not trip:
            return 0
        
        dist = pisah_dist_by_type(vehicle_idx)
        cost = dist[0][trip[0]]
        for i in range(len(trip)-1):
            cost += dist[trip[i]][trip[i+1]]
        cost += dist[trip[-1]][0]
        return cost

    def total_cost(routes):
        total = 0
        for v_idx, vehicle_trips in enumerate(routes):
            for trip in vehicle_trips:
                total += trip_cost(trip, v_idx)
        return total
    
    def is_feasible(routes):
        for v_idx, vehicle_trips in enumerate(routes):
            capacity = vehicle_list[v_idx]["capacity"]
            for trip in vehicle_trips:
                if sum(demands[c] for c in trip) > capacity:
                    return False
        return True
    
    # Neighborhood Structures
    def neighborhood_swap_within_route(routes):
        # NS-1: Swap 2 customers dalam route yang sama
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
        # NS-2: Relocate customer ke route lain
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
        # NS-3: Exchange customers antara 2 routes
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
