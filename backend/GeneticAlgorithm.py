import random

class VRPSolver:
    def __init__(self, dist_car, dist_bike, pop_size, generations, mutation_rate,
                 car_count, bike_count, car_capacity, bike_capacity, demands):
        # init input to attr
        self.dist_car = dist_car
        self.dist_bike = dist_bike
        self.pop_size = pop_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.car_count = car_count
        self.bike_count = bike_count
        self.car_capacity = car_capacity
        self.bike_capacity = bike_capacity
        self.demands = demands

        # derived attr
        self.n_location = len(dist_car)
        self.depot_idx = 0
        self.customer_locations = list(range(1, self.n_location))
        self.total_vehicles = car_count + bike_count
        self.vehicle_capacities = [car_capacity] * car_count + [bike_capacity] * bike_count

    def generate_clarke_wright_chrom(self):
        # calc saving
        savings = []
        for i in self.customer_locations:
            for j in self.customer_locations:
                if i != j:
                    # savings = d(0,i) + d(0,j) - d(i,j)
                    s_val = self.dist_car[0][i] + self.dist_car[0][j] - self.dist_car[i][j]
                    savings.append((s_val, i, j))
        
        # Sort savings descending
        savings.sort(key=lambda x: x[0], reverse=True)
        
        # init route each customer in single route
        routes = []
        for c in self.customer_locations:
            routes.append([c])
            
        def find_route(node):
            for r in routes:
                if node in r:
                    return r
            return None

        # merge route based on saving
        max_cap = max(self.car_capacity, self.bike_capacity) 
        
        for s_val, i, j in savings:
            route_i = find_route(i)
            route_j = find_route(j)
            
            if route_i != route_j:

                if route_i[-1] == i and route_j[0] == j:
                    dem_i = sum(self.demands[x] for x in route_i)
                    dem_j = sum(self.demands[x] for x in route_j)
                    if dem_i + dem_j <= max_cap:
                        route_i.extend(route_j)
                        routes.remove(route_j)
                        
                elif route_i[0] == i and route_j[-1] == j:
                    dem_i = sum(self.demands[x] for x in route_i)
                    dem_j = sum(self.demands[x] for x in route_j)
                    if dem_i + dem_j <= max_cap:
                        route_j.extend(route_i)
                        routes.remove(route_i)

        # conver route to chromosome
        cw_chrom = []
        for idx, r in enumerate(routes):
            cw_chrom.extend(r)
            if idx < len(routes) - 1:
                cw_chrom.append(-1)
        
        return cw_chrom

    def generate_chrom(self):
        route = self.customer_locations[:]
        random.shuffle(route)

        if self.total_vehicles <= 1 or len(route) < self.total_vehicles:
            return route
        
        chrom = []
        current_load = 0
        vehicle_idx = 0

        for customer in route:
            customer_demand = self.demands[customer]
            
            if vehicle_idx < self.total_vehicles:
                current_capacity = self.vehicle_capacities[vehicle_idx]
                
                if current_load + customer_demand > current_capacity:
                    if current_load > 0:
                        chrom.append(-1)
                        vehicle_idx += 1
                    current_load = 0
            
            chrom.append(customer)
            current_load += customer_demand
        
        return chrom

    def generate_population(self):
        pop = []
        # first chrom from cw saving 
        cw_solution = self.generate_clarke_wright_chrom()
        pop.append(cw_solution)
        
        # fill rest with random generate chrom
        for _ in range(self.pop_size - 1):
            pop.append(self.generate_chrom())
            
        return pop

    def decode_chrom(self, chrom):
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
            if i < self.car_count:
                vehicle_type = "car"
            else:
                vehicle_type = "bike"

            full_route = [self.depot_idx] + route + [self.depot_idx]
            routes_with_types.append({
                "route": full_route,
                "type": vehicle_type
            })

        return routes_with_types

    def calculate_cost(self, routes_with_types):
        """Calculate total cost with capacity penalty"""
        total = 0
        capacity_penalty = 0
        
        for i, route_info in enumerate(routes_with_types):
            route = route_info["route"]
            vtype = route_info["type"]
            
            dist = self.dist_bike if vtype == "bike" else self.dist_car
            
            # calc route distance
            for j in range(len(route) - 1):
                total += dist[route[j]][route[j+1]]
            
            # calc capacity violation
            route_demand = sum(self.demands[customer] for customer in route if customer != 0)
            
            if i < len(self.vehicle_capacities):
                capacity = self.vehicle_capacities[i]
            else:
                capacity = self.bike_capacity
            
            if route_demand > capacity:
                capacity_penalty += (route_demand - capacity) * 10000
        
        return total + capacity_penalty

    def fitness(self, chrom):
        routes = self.decode_chrom(chrom)
        cost = self.calculate_cost(routes)

        num_routes = len(routes)
        
        # penalites
        if num_routes < self.total_vehicles:
            penalty = 100000 * (self.total_vehicles - num_routes)
            cost += penalty
        
        if num_routes > self.total_vehicles:
            penalty = 50000 * (num_routes - self.total_vehicles)
            cost += penalty
        
        if cost == 0: return float('inf')
        return 1 / cost

    def aex_crossover(self, parent1, parent2):
        p1_customer = [g for g in parent1 if g != -1]
        p2_customer = [g for g in parent2 if g != -1]

        if len(p1_customer) < 2:
            return parent1[:]
        
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
                unvisited = [city for city in p1_customer if city not in visited]
                if not unvisited:
                    break
                next_city = unvisited[0]
            
            child.append(next_city)
            visited.add(next_city)
            current = next_city
            use_parent1 = not use_parent1

        chromosome = []
        current_load = 0
        vehicle_idx = 0
        
        # reinsert separators 
        for customer in child:
            customer_demand = self.demands[customer]
            
            if vehicle_idx < self.total_vehicles:
                current_capacity = self.vehicle_capacities[vehicle_idx]
                
                if current_load + customer_demand > current_capacity and current_load > 0:
                    chromosome.append(-1)
                    vehicle_idx += 1
                    current_load = 0
            
            chromosome.append(customer)
            current_load += customer_demand
        
        return chromosome

    def inversion_mutation(self, chrom):
        if random.random() < self.mutation_rate:
            mutation_type = random.choice(['inversion', 'move_separator'])
            
            if mutation_type == 'inversion':
                customer_indices = [i for i, g in enumerate(chrom) if g != -1]
                if len(customer_indices) >= 2:
                    i, j = sorted(random.sample(customer_indices, 2))
                    segment = []
                    segment_indices = []
                    for idx in range(i, j + 1):
                        if chrom[idx] != -1:
                            segment.append(chrom[idx])
                            segment_indices.append(idx)
                    segment.reverse()
                    for idx, val in zip(segment_indices, segment):
                        chrom[idx] = val
            
            elif mutation_type == 'move_separator' and self.total_vehicles > 1:
                sep_indices = [i for i, g in enumerate(chrom) if g == -1]
                if sep_indices:
                    sep_idx = random.choice(sep_indices)
                    chrom.pop(sep_idx)
                    customer_indices = [i for i, g in enumerate(chrom) if g != -1]
                    if customer_indices:
                        new_pos = random.choice(customer_indices)
                        chrom.insert(new_pos, -1)

        return chrom

    def run(self):
        """Main evolution loop"""
        population = self.generate_population()
        history = []
        best_chrom = None
        best_cost = float("inf")

        for gen in range(self.generations):
            # evaluate pop
            scored = [(ind, self.fitness(ind)) for ind in population]
            scored.sort(key=lambda x: x[1], reverse=True)

            # get best chrom
            best = scored[0][0]
            routes = self.decode_chrom(best)
            cost = self.calculate_cost(routes)

            if cost < best_cost:
                best_cost = cost
                best_chrom = best[:]

            if gen % 5 == 0:
                car_routes = sum(1 for r in routes if r["type"] == "car")
                bike_routes = sum(1 for r in routes if r["type"] == "bike")
                history.append({
                    "iteration": gen,
                    "cost": best_cost,
                    "carsUsed": car_routes,
                    "bikesUsed": bike_routes
                })

            # new pop with selection and elitism
            new_pop = [best]
            
            while len(new_pop) < self.pop_size:
                # tournament selections
                sample_size = min(len(scored), max(15, self.pop_size // 3))
                parents = random.sample(scored[:sample_size], 2)
                p1, _ = parents[0]
                p2, _ = parents[1]

                child = self.aex_crossover(p1, p2)
                child = self.inversion_mutation(child)
                new_pop.append(child)

            population = new_pop
        
        final_routes = self.decode_chrom(best_chrom)
        return final_routes, best_cost/1000, history

def genetic_algorithm(dist_car, dist_bike, pop_size, generations, mutation_rate,
                      car_count, bike_count, car_capacity, bike_capacity, demands):
    
    solver = VRPSolver(dist_car, dist_bike, pop_size, generations, mutation_rate,
                       car_count, bike_count, car_capacity, bike_capacity, demands)
    
    return solver.run()