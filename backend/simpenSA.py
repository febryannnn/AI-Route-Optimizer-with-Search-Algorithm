import random
import math
from copy import deepcopy

def simulated_annealing(dist_car, dist_bike, demands, vehicles, max_iter, temp, cooling):
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
    
    # Validasi feasibility
    total_demand = sum(demands[c] for c in customers)
    total_capacity = sum(v['capacity'] for v in vehicle_list)
    
    print(f"Vehicle utilization target: {(total_demand / total_capacity * 100):.1f}%")
    
    max_customer_demand = max(demands[c] for c in customers)
    max_vehicle_capacity = max(v['capacity'] for v in vehicle_list)
    
    if max_customer_demand > max_vehicle_capacity:
        raise Exception(f"Infeasible: Customer demand {max_customer_demand} exceeds max vehicle capacity {max_vehicle_capacity}")
    
    print("=" * 50)
    print()

    # Ambil matriks jarak kendaraan k
    def pisah_dist_by_type(vehicle_idx):
        vtype = vehicle_list[vehicle_idx]["type"].lower()
        return dist_bike if vtype == "motor" else dist_car

    # INISIASI SOLUWI AWAL
    def construct_initial_solution(customers):
        """
        Konstruksi initial solution yang mendistribusikan customers ke SEMUA kendaraan
        secara seimbang untuk memanfaatkan semua resources
        """
        v = len(vehicle_list)
        
        # Validasi awal
        for cust in customers:
            demand = demands[cust]
            max_capacity = max(vehicle_list[i]["capacity"] for i in range(v))
            if demand > max_capacity:
                raise Exception(f"Customer {cust} demand ({demand}) exceeds max vehicle capacity ({max_capacity})")
        
        # Sort customers by demand (descending)
        sorted_customers = sorted(customers, key=lambda c: demands[c], reverse=True)
        
        # Strategy: Round-robin assignment dengan mempertimbangkan capacity
        routes = [[] for _ in range(v)]
        current_loads = [0] * v
        
        # Phase 1: Assign customers secara round-robin ke vehicles yang bisa handle
        vehicle_order = list(range(v))
        current_vehicle_idx = 0
        
        for cust in sorted_customers:
            demand = demands[cust]
            assigned = False
            attempts = 0
            
            # Coba assign ke vehicle berikutnya dalam urutan round-robin
            while not assigned and attempts < v:
                v_idx = vehicle_order[current_vehicle_idx % v]
                
                # Cek apakah vehicle ini bisa handle customer ini
                if demand <= vehicle_list[v_idx]["capacity"]:
                    # Cek apakah masih ada space di current load
                    if current_loads[v_idx] + demand <= vehicle_list[v_idx]["capacity"]:
                        routes[v_idx].append(cust)
                        current_loads[v_idx] += demand
                        assigned = True
                        current_vehicle_idx += 1  # Pindah ke vehicle berikutnya
                    else:
                        # Vehicle full, tapi bisa dipakai untuk trip baru
                        # Reset load untuk trip baru
                        routes[v_idx].append(cust)
                        current_loads[v_idx] = demand
                        assigned = True
                        current_vehicle_idx += 1
                else:
                    # Vehicle ini tidak bisa handle, skip
                    current_vehicle_idx += 1
                
                attempts += 1
            
            if not assigned:
                raise Exception(f"Cannot assign customer {cust} - this should not happen!")
        
        # Phase 2: Split menjadi trips per vehicle
        wrapped_routes = []
        for j in range(v):
            vehicle_trips = []
            current_trip = []
            current_trip_load = 0
            
            for cust in routes[j]:
                demand = demands[cust]
                
                if current_trip_load + demand > vehicle_list[j]["capacity"]:
                    if current_trip:
                        vehicle_trips.append(current_trip[:])
                    current_trip = [cust]
                    current_trip_load = demand
                else:
                    current_trip.append(cust)
                    current_trip_load += demand
            
            if current_trip:
                vehicle_trips.append(current_trip[:])
            
            wrapped_routes.append(vehicle_trips)
        
        # Phase 3: Balance workload across vehicles
        wrapped_routes = balance_workload(wrapped_routes)
        
        return wrapped_routes
    
    def balance_workload(routes):
        v = len(routes)
        
        # Hitung workload per vehicle (total distance)
        workloads = []
        for v_idx in range(v):
            total_distance = 0
            for trip in routes[v_idx]:
                total_distance += trip_cost(trip, v_idx)
            workloads.append(total_distance)
        
        if not any(workloads):  # Semua kosong
            return routes
        
        avg_workload = sum(workloads) / len([w for w in workloads if w > 0]) if any(workloads) else 0
        
        # Identifikasi overloaded dan underloaded vehicles
        max_iterations = 20
        for iteration in range(max_iterations):
            overloaded = [(i, w) for i, w in enumerate(workloads) if w > avg_workload * 1.3 and routes[i]]
            underloaded = [(i, w) for i, w in enumerate(workloads) if w < avg_workload * 0.7 or not routes[i]]
            
            if not overloaded or not underloaded:
                break
            
            # Sort: overloaded descending, underloaded ascending
            overloaded.sort(key=lambda x: x[1], reverse=True)
            underloaded.sort(key=lambda x: x[1])
            
            moved = False
            
            # Pindahkan trip dari overloaded ke underloaded
            for over_idx, _ in overloaded:
                if not routes[over_idx]:
                    continue
                
                for under_idx, _ in underloaded:
                    if over_idx == under_idx:
                        continue
                    
                    # Cek apakah ada trip yang bisa dipindah
                    for trip_idx in range(len(routes[over_idx])):
                        trip = routes[over_idx][trip_idx]
                        trip_demand = sum(demands[c] for c in trip)
                        
                        # Cek apakah underloaded vehicle bisa handle trip ini
                        if trip_demand <= vehicle_list[under_idx]["capacity"]:
                            # Pindahkan trip
                            routes[under_idx].append(trip[:])
                            routes[over_idx].pop(trip_idx)
                            
                            # Update workloads
                            trip_distance = trip_cost(trip, over_idx)
                            workloads[over_idx] -= trip_distance
                            workloads[under_idx] += trip_cost(trip, under_idx)
                            
                            moved = True
                            break
                
                if moved:
                    break
            
            if not moved:
                break
        
        return routes

    trip_cost_cache = {}
    
    def trip_cost(trip, vehicle_idx):
        if not trip:
            return 0
        
        trip_key = (tuple(trip), vehicle_idx)
        if trip_key in trip_cost_cache:
            return trip_cost_cache[trip_key]
        
        dist = pisah_dist_by_type(vehicle_idx)
        cost = dist[0][trip[0]]
        for i in range(len(trip)-1):
            cost += dist[trip[i]][trip[i+1]]
        cost += dist[trip[-1]][0]
        
        trip_cost_cache[trip_key] = cost
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
        
        # Validasi: semua customer harus dikunjungi exactly once
        visited = set()
        for v_idx, vehicle_trips in enumerate(routes):
            for trip in vehicle_trips:
                for c in trip:
                    if c in visited:
                        return False
                    visited.add(c)
        
        return len(visited) == len(customers)
    
    # ============================================================================
    # NEIGHBORHOOD STRUCTURES with Vehicle Reallocation
    # ============================================================================
    def neighborhood_swap_within_route(routes):
        """Swap 2 customers dalam 1 trip"""
        candidates = []
        count = 0
        max_candidates = 100
        
        for v_idx in range(total_vehicles):
            for trip_idx in range(len(routes[v_idx])):
                trip = routes[v_idx][trip_idx]
                if len(trip) >= 2:
                    pairs = [(i, j) for i in range(len(trip)) for j in range(i+1, len(trip))]
                    if len(pairs) > 5:
                        pairs = random.sample(pairs, 5)
                    
                    for i, j in pairs:
                        if count >= max_candidates:
                            return candidates
                        
                        new_routes = [[t[:] for t in vt] for vt in routes]
                        new_routes[v_idx][trip_idx][i], new_routes[v_idx][trip_idx][j] = \
                            new_routes[v_idx][trip_idx][j], new_routes[v_idx][trip_idx][i]
                        candidates.append(new_routes)
                        count += 1
        
        return candidates

    def neighborhood_relocate(routes):
        """Relocate customer dari 1 vehicle ke vehicle lain"""
        candidates = []
        count = 0
        max_candidates = 100
        
        for v1 in range(total_vehicles):
            for trip1_idx in range(len(routes[v1])):
                trip1 = routes[v1][trip1_idx]
                if not trip1:
                    continue
                
                cust_indices = list(range(len(trip1)))
                if len(cust_indices) > 3:
                    cust_indices = random.sample(cust_indices, 3)
                
                for cust_idx in cust_indices:
                    if count >= max_candidates:
                        return candidates
                    
                    customer = trip1[cust_idx]
                    
                    # Coba SEMUA vehicle lain (untuk distribusi merata)
                    target_vehicles = [v for v in range(total_vehicles) if v != v1]
                    random.shuffle(target_vehicles)
                    
                    # Ambil subset untuk efisiensi
                    target_vehicles = target_vehicles[:5]
                    
                    for v2 in target_vehicles:
                        new_routes = [[t[:] for t in vt] for vt in routes]
                        
                        removed_customer = new_routes[v1][trip1_idx].pop(cust_idx)
                        if not new_routes[v1][trip1_idx]:
                            new_routes[v1].pop(trip1_idx)
                        
                        # Coba masukkan ke trip yang existing atau buat trip baru
                        inserted = False
                        
                        # Coba insert ke existing trips
                        for trip_idx in range(len(new_routes[v2])):
                            trip_load = sum(demands[c] for c in new_routes[v2][trip_idx])
                            if trip_load + demands[removed_customer] <= vehicle_list[v2]["capacity"]:
                                new_routes[v2][trip_idx].append(removed_customer)
                                inserted = True
                                break
                        
                        # Jika tidak bisa, buat trip baru
                        if not inserted:
                            if demands[removed_customer] <= vehicle_list[v2]["capacity"]:
                                new_routes[v2].append([removed_customer])
                                inserted = True
                        
                        if inserted and is_feasible(new_routes):
                            candidates.append(new_routes)
                            count += 1
        
        return candidates

    def neighborhood_exchange(routes):
        """Exchange customers antar vehicle"""
        candidates = []
        count = 0
        max_candidates = 100
        
        for v1 in range(total_vehicles):
            for trip1_idx in range(len(routes[v1])):
                if not routes[v1][trip1_idx]:
                    continue
                
                cust1_indices = list(range(len(routes[v1][trip1_idx])))
                if len(cust1_indices) > 2:
                    cust1_indices = random.sample(cust1_indices, 2)
                
                for cust1_idx in cust1_indices:
                    if count >= max_candidates:
                        return candidates
                    
                    # Coba exchange dengan vehicle lain
                    for v2 in range(total_vehicles):
                        if v1 == v2 or not routes[v2]:
                            continue
                        
                        for trip2_idx in range(len(routes[v2])):
                            if not routes[v2][trip2_idx]:
                                continue
                            
                            cust2_idx = random.randrange(len(routes[v2][trip2_idx]))
                            
                            new_routes = [[t[:] for t in vt] for vt in routes]
                            new_routes[v1][trip1_idx][cust1_idx], new_routes[v2][trip2_idx][cust2_idx] = \
                                new_routes[v2][trip2_idx][cust2_idx], new_routes[v1][trip1_idx][cust1_idx]
                            
                            if is_feasible(new_routes):
                                candidates.append(new_routes)
                                count += 1
                                if count >= max_candidates:
                                    return candidates
        
        return candidates
    
    def neighborhood_trip_relocation(routes):
        """Pindahkan entire trip dari 1 vehicle ke vehicle lain"""
        candidates = []
        count = 0
        max_candidates = 100
        
        for v1 in range(total_vehicles):
            if not routes[v1]:
                continue
            
            for trip_idx in range(len(routes[v1])):
                trip = routes[v1][trip_idx]
                if not trip:
                    continue
                
                trip_demand = sum(demands[c] for c in trip)
                
                # Coba pindahkan ke vehicle lain
                for v2 in range(total_vehicles):
                    if v1 == v2:
                        continue
                    
                    if count >= max_candidates:
                        return candidates
                    
                    # Cek apakah v2 bisa handle trip ini
                    if trip_demand <= vehicle_list[v2]["capacity"]:
                        new_routes = [[t[:] for t in vt] for vt in routes]
                        
                        # Remove trip dari v1
                        removed_trip = new_routes[v1].pop(trip_idx)
                        
                        # Add trip ke v2
                        new_routes[v2].append(removed_trip)
                        
                        if is_feasible(new_routes):
                            candidates.append(new_routes)
                            count += 1
        
        return candidates

    # Local search
    def local_search(routes):
        current = [[t[:] for t in vt] for vt in routes]
        current_cost = total_cost(current)
        
        for ns_func in [neighborhood_swap_within_route, 
                       neighborhood_relocate, 
                       neighborhood_exchange]:
            
            neighbors = ns_func(current)
            if not neighbors:
                continue
            
            for neighbor in neighbors[:50]:
                neighbor_cost = total_cost(neighbor)
                if neighbor_cost < current_cost:
                    return neighbor, neighbor_cost
        
        return current, current_cost

    print("Constructing initial solution with vehicle distribution...")
    S0 = construct_initial_solution(customers)
    print("Applying local search to initial solution...")
    S0, cost_S0 = local_search(S0)
    
    def count_vehicles_used(S):
        cars = 0
        bikes = 0
        for v_idx, vehicle_type_routes in enumerate(S):
            v_type = vehicle_list[v_idx]["type"].lower()
            used = any(len(route) > 0 for route in vehicle_type_routes)
            if used:
                if v_type == "mobil" or v_type == "car":
                    cars += 1
                else:
                    bikes += 1
        return cars, bikes

    # SA Parameters
    Len = 25
    L = 125
    cooling_factor = cooling
    T0 = temp
    
    S = deepcopy(S0)
    cost_S = cost_S0
    S_star = deepcopy(S0)
    best_cost = cost_S0
    T = T0
    iteration = 0

    cars_used, bikes_used = count_vehicles_used(S)
    history = [{
        "iteration": 0,
        "cost": best_cost,
        "temperature": T,
        "carsUsed": cars_used,
        "bikesUsed": bikes_used
    }]

    print(f"Starting SA with T0={T0:.2f}, initial cost={best_cost:.2f}")
    
    # SA main loop
    Tmin = 0.01
    ns_funcs = [
        neighborhood_swap_within_route, 
        neighborhood_relocate, 
        neighborhood_exchange,
        neighborhood_trip_relocation  # NEW: Trip relocation
    ]
    
    history_interval = 5
    stuck_counter = 0
    reheat_count = 0
    
    while T > Tmin and iteration < max_iter:
        i = 0
        j = 0

        while i < Len and j < L:
            ns = random.choice(ns_funcs)
            neighbors = ns(S)
            
            if not neighbors:
                j += 1
                continue
            
            S_prime = random.choice(neighbors)
            
            if not is_feasible(S_prime):
                j += 1
                continue

            cost_S_prime = total_cost(S_prime)
            delta = cost_S_prime - cost_S

            if delta < 0 or random.random() < math.exp(-delta / T):
                S = deepcopy(S_prime)
                cost_S = cost_S_prime
                i += 1
                j = 0

                if cost_S < best_cost:
                    print(f"New best at iter {iteration}: {cost_S:.2f}")
                    S_improved, cost_improved = local_search(S)
                    S_star = deepcopy(S_improved)
                    best_cost = cost_improved
                    stuck_counter = 0
                    
                    T = T * cooling_factor
                else:
                    stuck_counter += 1
            else:
                j += 1
                stuck_counter += 1
        
        # Reheat if stuck
        if stuck_counter >= 50 and reheat_count < 3:
            T = T0 * 0.5
            stuck_counter = 0
            reheat_count += 1
            print(f"🔥 REHEAT #{reheat_count}: T={T:.2f}")
            
            # Perturbation
            for _ in range(10):
                ns = random.choice(ns_funcs)
                neighbors = ns(S)
                if neighbors:
                    S = random.choice(neighbors)

        if iteration > 0 and iteration % history_interval == 0:
            cars_used, bikes_used = count_vehicles_used(S_star)
            history.append({
                "iteration": iteration,
                "cost": best_cost,
                "temperature": T,
                "carsUsed": cars_used,
                "bikesUsed": bikes_used
            })

        T = T * cooling_factor
        iteration += 1
        
        if iteration % 10 == 0:
            print(f"Iteration {iteration}, T={T:.4f}, current={cost_S:.2f}, best={best_cost:.2f}")
    
    if iteration > 0 and (iteration - 1) % history_interval != 0:
        cars_used, bikes_used = count_vehicles_used(S_star)
        history.append({
            "iteration": iteration - 1,
            "cost": best_cost,
            "temperature": T,
            "carsUsed": cars_used,
            "bikesUsed": bikes_used
        })

    print("Formatting output...")
    
    # Format output
    formatted_routes = []
    
    for v_idx, vehicle_trips in enumerate(S_star):
        if not vehicle_trips or not any(vehicle_trips):
            continue
            
        vehicle_capacity = vehicle_list[v_idx]["capacity"]
        merged_route = []
        
        for trip_idx, trip in enumerate(vehicle_trips):
            if not trip:
                continue
            
            trip_demand = sum(demands[c] for c in trip)
            if trip_demand > vehicle_capacity:
                print(f"WARNING: Vehicle {v_idx+1} Trip {trip_idx+1} exceeds capacity! Demand: {trip_demand}, Capacity: {vehicle_capacity}")
            
            merged_route.extend(trip)
            
            if trip_idx < len(vehicle_trips) - 1:
                if trip_idx + 1 < len(vehicle_trips) and vehicle_trips[trip_idx + 1]:
                    merged_route.append(0)
        
        if merged_route:
            formatted_routes.append(merged_route)
    
    # Validasi final
    all_customers_final = []
    for route in formatted_routes:
        all_customers_final.extend([c for c in route if c != 0])
    
    if len(all_customers_final) != len(set(all_customers_final)):
        print("ERROR: Duplicate customers in final solution!")
        duplicates = [c for c in all_customers_final if all_customers_final.count(c) > 1]
        print(f"Duplicates: {set(duplicates)}")
    
    missing = set(customers) - set(all_customers_final)
    if missing:
        print(f"WARNING: Missing customers: {missing}")
    
    # Tampilkan summary per vehicle
    print("\nRoute Summary:")
    route_idx = 0
    for v_idx, vehicle_trips in enumerate(S_star):
        if not vehicle_trips or not any(vehicle_trips):
            continue
            
        v_type = vehicle_list[v_idx]["type"]
        v_capacity = vehicle_list[v_idx]["capacity"]
        num_trips = len([t for t in vehicle_trips if t])
        total_load = sum(sum(demands[c] for c in trip) for trip in vehicle_trips if trip)
        
        print(f"  Vehicle {route_idx+1} ({v_type}, capacity={v_capacity}): {num_trips} trips, total_load={total_load}")
        
        for trip_idx, trip in enumerate(vehicle_trips):
            if trip:
                trip_demand = sum(demands[c] for c in trip)
                print(f"    Trip {trip_idx+1}: {trip}, Demand={trip_demand}/{v_capacity}")
        
        route_idx += 1

    return formatted_routes, best_cost, history, vehicle_list