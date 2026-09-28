"""
Simple in-memory Python storage for the Autonomous Travel Agent.
Demonstrates:
1. Basic user preferences (e.g. preferred_transport, preferred_hotel_tier)
2. Current trip state & session history
"""

from typing import Any, Dict, Optional


class TravelMemory:
    def __init__(self):
        self.preferences: Dict[str, Any] = {
            "preferred_transport": None,
            "preferred_hotel_tier": None
        }
        self.current_trip: Dict[str, Any] = {}
        self.trips: Dict[str, Dict[str, Any]] = {}

    def update_preferences(self, new_prefs: Dict[str, Any]) -> None:
        """Stores or updates persistent user preferences."""
        for key, val in new_prefs.items():
            if val is not None:
                self.preferences[key] = str(val).strip().lower()

    def get_preferences(self) -> Dict[str, Any]:
        """Returns the current stored preferences."""
        return dict(self.preferences)

    def save_trip(self, trip_id: str, trip_data: Dict[str, Any]) -> None:
        """Stores current trip state and indexes it by trip_id."""
        self.current_trip = trip_data
        self.trips[trip_id] = trip_data

    def get_current_trip(self) -> Dict[str, Any]:
        """Returns the active trip data."""
        return self.current_trip

    def get_trip(self, trip_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a trip by its ID."""
        return self.trips.get(trip_id)

    def update_trip_status(self, trip_id: str, status: str, authorized_action: Optional[str] = None) -> bool:
        """Updates approval status and final action."""
        if trip_id in self.trips:
            self.trips[trip_id]["status"] = status
            if authorized_action:
                self.trips[trip_id]["authorized_action"] = authorized_action
            if self.current_trip.get("trip_id") == trip_id:
                self.current_trip["status"] = status
                if authorized_action:
                    self.current_trip["authorized_action"] = authorized_action
            return True
        return False

    def reset(self) -> None:
        """Resets the in-memory state."""
        self.preferences = {
            "preferred_transport": None,
            "preferred_hotel_tier": None
        }
        self.current_trip = {}
        self.trips = {}


# Global singleton instance for the app session
memory_store = TravelMemory()
