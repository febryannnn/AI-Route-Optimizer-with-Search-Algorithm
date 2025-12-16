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

# Distance Matrix
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


# Cost
def route_cost(route, dist):
    total = 0
    for i in range(len(route) - 1):
        total += dist[route[i]][route[i+1]]
    total += dist[route[-1]][route[0]]
    return total
