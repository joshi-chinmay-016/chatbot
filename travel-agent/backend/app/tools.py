"""
Mock travel tools for the Autonomous Travel Agent.
Deterministic Python functions simulating real-world travel APIs.
"""

from typing import Any, Dict, List


def search_transport(origin: str, destination: str) -> Dict[str, Any]:
    """
    Searches available transport options between origin and destination.
    Returns mock transport options with mode and round-trip or single price.
    """
    # Deterministic mock transport data
    return {
        "origin": origin,
        "destination": destination,
        "options": [
            {"type": "Bus", "price": 1000, "details": "AC Sleeper overnight bus"},
            {"type": "Train", "price": 1200, "details": "Superfast Express 3A"},
            {"type": "Flight", "price": 3500, "details": "Economy direct flight"}
        ]
    }


def search_hotels(destination: str) -> Dict[str, Any]:
    """
    Searches available accommodation options at the destination.
    Returns mock hotel tiers with price per night.
    """
    return {
        "destination": destination,
        "options": [
            {"name": "Budget Hotel", "price_per_night": 2000, "tier": "budget", "amenities": ["Wi-Fi", "AC"]},
            {"name": "Comfort Hotel", "price_per_night": 3000, "tier": "comfort", "amenities": ["Wi-Fi", "AC", "Breakfast", "Pool"]},
            {"name": "Premium Hotel", "price_per_night": 5000, "tier": "premium", "amenities": ["Wi-Fi", "AC", "Breakfast", "Infinity Pool", "Spa"]}
        ]
    }


def create_itinerary(destination: str, duration: int) -> List[Dict[str, Any]]:
    """
    Generates a day-by-day travel itinerary for the specified duration and destination.
    """
    dest_clean = destination.strip().title()
    
    # Destination-specific flavor
    activities_by_dest = {
        "Goa": [
            {"morning": "Arrival, hotel check-in, and welcome drink", "afternoon": "Relax at Calangute & Baga beach", "evening": "Sunset cruise and beachside dinner"},
            {"morning": "Visit Aguada Fort and Chapora Fort", "afternoon": "Water sports at Anjuna beach (parasailing & jet skiing)", "evening": "Explore Tito's Lane and night market"},
            {"morning": "Visit Old Goa churches (Basilica of Bom Jesus)", "afternoon": "Spice plantation tour & traditional Goan lunch", "evening": "Miramar beach stroll and souvenir shopping"},
            {"morning": "Dudhsagar waterfalls day excursion", "afternoon": "Jungle trek and natural pool swim", "evening": "Dinner at Panaji waterfront"},
            {"morning": "Leisure morning and cafe hopping in Fontainhas", "afternoon": "Souvenir shopping and checkout", "evening": "Departure"}
        ]
    }

    generic_activities = [
        {"morning": f"Arrival in {dest_clean} & hotel check-in", "afternoon": "Explore neighborhood & local cuisine", "evening": "Sunset walking tour"},
        {"morning": "Visit iconic cultural & historic landmarks", "afternoon": "Outdoor sightseeing & local experiences", "evening": "Cultural show and dinner"},
        {"morning": "Local craft markets & souvenir shopping", "afternoon": "Relaxation and scenic viewpoint", "evening": "Farewell dinner & departure"},
        {"morning": "Day excursion to nearby attraction", "afternoon": "Adventure activity or museum visit", "evening": "Dinner at top-rated local restaurant"},
        {"morning": "Leisure morning & photography walk", "afternoon": "Hotel checkout", "evening": "Departure"}
    ]

    selected_pool = activities_by_dest.get(dest_clean, generic_activities)
    
    itinerary = []
    for day in range(1, duration + 1):
        idx = (day - 1) % len(selected_pool)
        act = selected_pool[idx]
        itinerary.append({
            "day": day,
            "title": f"Day {day} in {dest_clean}",
            "morning": act["morning"],
            "afternoon": act["afternoon"],
            "evening": act["evening"]
        })
    return itinerary


def calculate_budget(transport_cost: int, hotel_cost: int, activity_cost: int) -> int:
    """
    Calculates total estimated cost. Pure deterministic arithmetic.
    """
    return int(transport_cost) + int(hotel_cost) + int(activity_cost)
