"""
Autonomous Travel Agent implementation.
Demonstrates the full agent lifecycle:
Goal -> Goal Understanding -> Planning -> Reasoning -> Tool Selection ->
Tool Execution -> Observation -> Evaluation -> (Re-planning if needed) ->
Final Plan -> Human Approval -> Authorized Action.
"""

import os
import re
import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

# Load .env searching up the hierarchy
for candidate in [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
]:
    if candidate.exists():
        load_dotenv(candidate)
        break

from google import genai
from .schemas import (
    StepLog,
    TravelConstraints,
    TravelResponse,
    FinalPlan,
)
from .tools import (
    search_transport,
    search_hotels,
    create_itinerary,
    calculate_budget,
)
from .memory import memory_store


class TravelAgent:
    """
    Autonomous travel agent implementing the complete class activity lifecycle.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client: Optional[genai.Client] = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[Agent Warning] Failed to initialize Gemini client: {e}")
        self.model_name = "gemini-2.5-flash"

    def _call_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
        """Calls Gemini API safely with error handling and fallback."""
        if not self.client:
            return None
        try:
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"System Instruction: {system_instruction}\n\n{prompt}"
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt,
            )
            return response.text if response else None
        except Exception as e:
            print(f"[Agent LLM Error] Gemini call failed: {e}")
            return None

    def extract_constraints(self, message: str, stored_prefs: Dict[str, Any]) -> TravelConstraints:
        """
        Uses LLM to extract travel constraints, with deterministic regex fallback.
        """
        prompt = f"""
You are an autonomous travel agent. Parse the following user travel request and extract constraints in valid JSON.
User Request: "{message}"
Known User Preferences from Memory: {json.dumps(stored_prefs)}

Extract strictly as JSON with keys:
- "origin": string (default "Bangalore" if not specified)
- "destination": string (e.g. "Goa")
- "duration_days": integer (e.g. 3)
- "budget": integer in INR (e.g. 15000, numbers only without symbols)
- "preferences": dictionary of preferences like {{"preferred_transport": "train"|"flight"|"bus", "preferred_tier": "budget"|"comfort"|"premium"}}

Return ONLY raw JSON, no markdown fences.
"""
        extracted_json = None
        llm_output = self._call_gemini(prompt)
        if llm_output:
            try:
                clean = llm_output.strip().replace("```json", "").replace("```", "").strip()
                extracted_json = json.loads(clean)
            except Exception:
                pass

        if not extracted_json:
            # Deterministic fallback parser
            extracted_json = self._fallback_parse(message, stored_prefs)

        # Merge with stored preferences
        prefs = extracted_json.get("preferences", {}) or {}
        for k, v in stored_prefs.items():
            if v and k not in prefs:
                prefs[k] = v

        return TravelConstraints(
            origin=extracted_json.get("origin", "Bangalore"),
            destination=extracted_json.get("destination", "Goa"),
            duration_days=int(extracted_json.get("duration_days", 3)),
            budget=int(extracted_json.get("budget", 15000)),
            preferences=prefs,
        )

    def _fallback_parse(self, message: str, stored_prefs: Dict[str, Any]) -> Dict[str, Any]:
        """Regex/heuristic fallback parsing for robustness."""
        msg_lower = message.lower()

        # Origin & Destination
        dest = "Goa"
        if "to " in msg_lower:
            parts = msg_lower.split("to ")[1].split()
            if parts:
                dest = parts[0].strip(",.!?").title()

        origin = "Bangalore"
        if "from " in msg_lower:
            parts = msg_lower.split("from ")[1].split()
            if parts:
                origin = parts[0].strip(",.!?").title()

        # Duration
        duration = 3
        dur_match = re.search(r"(\d+)\s*(?:-| )?day", msg_lower)
        if dur_match:
            duration = int(dur_match.group(1))

        # Budget
        budget = 15000
        budget_match = re.search(r"(?:under|budget|₹|rs\.?)\s*(\d+[\d,]*)", msg_lower)
        if budget_match:
            budget = int(budget_match.group(1).replace(",", ""))

        # Preferences
        prefs = dict(stored_prefs)
        if "flight" in msg_lower:
            prefs["preferred_transport"] = "flight"
        elif "train" in msg_lower:
            prefs["preferred_transport"] = "train"
        elif "bus" in msg_lower:
            prefs["preferred_transport"] = "bus"

        if "luxury" in msg_lower or "premium" in msg_lower:
            prefs["preferred_tier"] = "premium"
        elif "budget" in msg_lower:
            prefs["preferred_tier"] = "budget"

        return {
            "origin": origin,
            "destination": dest,
            "duration_days": duration,
            "budget": budget,
            "preferences": prefs,
        }

    def run(self, message: str, user_prefs: Optional[Dict[str, Any]] = None) -> TravelResponse:
        """
        Main autonomous execution loop.
        """
        trip_id = f"trip-{uuid.uuid4().hex[:8]}"
        step_logs: List[StepLog] = []
        step_count = 1

        # 1. Update memory with any provided preferences
        if user_prefs:
            memory_store.update_preferences(user_prefs)
        stored_prefs = memory_store.get_preferences()

        # 2. Goal Understanding (LLM)
        constraints = self.extract_constraints(message, stored_prefs)
        if constraints.preferences:
            memory_store.update_preferences(constraints.preferences)

        goal_desc = f"Plan a {constraints.duration_days}-day trip to {constraints.destination} from {constraints.origin} under ₹{constraints.budget:,}"

        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="GOAL_UNDERSTANDING",
                action="Extract travel constraints and parameters from user input",
                observation={
                    "origin": constraints.origin,
                    "destination": constraints.destination,
                    "duration_days": constraints.duration_days,
                    "budget": constraints.budget,
                    "preferences": constraints.preferences,
                },
                evaluation="SUCCESS: Extracted all required trip constraints.",
                reasoning=f"Identified primary goal: '{goal_desc}'. Checked memory for user preferences.",
            )
        )
        step_count += 1

        # 3. Planning
        initial_plan = [
            f"1. Search transport options between {constraints.origin} and {constraints.destination}",
            f"2. Search hotel options in {constraints.destination}",
            "3. Select transport and hotel options aligning with preferences",
            "4. Calculate estimated budget (transport + hotel + activities)",
            "5. Evaluate budget constraint against user limit",
            "6. Re-plan if budget constraint is violated",
            f"7. Create day-by-day itinerary for {constraints.duration_days} days",
            "8. Formulate final travel plan and request human approval",
        ]

        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="PLANNING",
                action="Create initial autonomous execution plan",
                observation=initial_plan,
                evaluation="SUCCESS: Execution plan formulated.",
                reasoning="Established a sequential execution plan with budget evaluation and re-planning fallback.",
            )
        )
        step_count += 1

        # 4. Tool Execution: search_transport
        transport_data = search_transport(constraints.origin, constraints.destination)
        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="TOOL_EXECUTION",
                action=f"search_transport(origin='{constraints.origin}', destination='{constraints.destination}')",
                observation=transport_data,
                evaluation="SUCCESS: Transport options retrieved.",
                reasoning="Gathered real-time transport options to evaluate against user budget and preferences.",
            )
        )
        step_count += 1

        # 5. Tool Execution: search_hotels
        hotel_data = search_hotels(constraints.destination)
        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="TOOL_EXECUTION",
                action=f"search_hotels(destination='{constraints.destination}')",
                observation=hotel_data,
                evaluation="SUCCESS: Hotel options retrieved.",
                reasoning="Retrieved accommodation options across multiple tiers (Budget, Comfort, Premium).",
            )
        )
        step_count += 1

        # 6. Initial Option Selection & Evaluation
        pref_transport = constraints.preferences.get("preferred_transport")
        pref_tier = constraints.preferences.get("preferred_tier")

        nights = max(1, constraints.duration_days - 1)
        activity_cost_per_day = 1000
        activities_total = activity_cost_per_day * constraints.duration_days

        # Pick initial transport:
        # If user explicitly preferred flight or if no preference, check if budget is generous
        initial_transport = None
        if pref_transport:
            for opt in transport_data["options"]:
                if opt["type"].lower() == pref_transport.lower():
                    initial_transport = opt
                    break

        if not initial_transport:
            # Default initial choice: Flight if budget >= 15000 and user asked for fast/flight, or Train/Flight
            # For class demo reproducibility: if user mentioned 'flight' or budget > 15000, pick Flight;
            # if budget is low (e.g. 10000 or 12000) or user asks with 'flight' that exceeds budget, pick Flight to demonstrate re-planning!
            if "flight" in message.lower() or constraints.budget > 15000:
                initial_transport = next(o for o in transport_data["options"] if o["type"] == "Flight")
            else:
                initial_transport = next(o for o in transport_data["options"] if o["type"] == "Train")

        # Pick initial hotel:
        initial_hotel = None
        if pref_tier:
            for opt in hotel_data["options"]:
                if opt["tier"].lower() == pref_tier.lower():
                    initial_hotel = opt
                    break

        if not initial_hotel:
            if "premium" in message.lower() or "luxury" in message.lower():
                initial_hotel = next(h for h in hotel_data["options"] if h["tier"] == "premium")
            elif "comfort" in message.lower() or constraints.budget >= 15000:
                initial_hotel = next(h for h in hotel_data["options"] if h["tier"] == "comfort")
            else:
                initial_hotel = next(h for h in hotel_data["options"] if h["tier"] == "comfort")

        # Transport cost calculation (round trip: 2x price)
        initial_transport_cost = initial_transport["price"] * 2
        initial_hotel_cost = initial_hotel["price_per_night"] * nights
        initial_total = calculate_budget(initial_transport_cost, initial_hotel_cost, activities_total)

        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="REASONING",
                action=f"calculate_budget(transport={initial_transport_cost}, hotel={initial_hotel_cost}, activities={activities_total})",
                observation={
                    "selected_transport": f"{initial_transport['type']} (₹{initial_transport['price']} x 2 ways = ₹{initial_transport_cost})",
                    "selected_hotel": f"{initial_hotel['name']} (₹{initial_hotel['price_per_night']}/night x {nights} nights = ₹{initial_hotel_cost})",
                    "activities": f"₹{activities_total} (₹{activity_cost_per_day}/day x {constraints.duration_days} days)",
                    "calculated_total": initial_total,
                    "user_budget": constraints.budget,
                },
                evaluation=f"{'FAIL: Budget exceeded' if initial_total > constraints.budget else 'PASS: Within budget'}",
                reasoning=(
                    f"Selected initial options ({initial_transport['type']} and {initial_hotel['name']}). "
                    f"Total calculated cost is ₹{initial_total:,} against budget ₹{constraints.budget:,}."
                ),
            )
        )
        step_count += 1

        # 7. Evaluation & Re-Planning (if budget exceeded)
        replanned = False
        replan_reason = None
        final_transport = initial_transport
        final_hotel = initial_hotel
        final_total = initial_total

        if initial_total > constraints.budget:
            replanned = True
            replan_reason = f"Initial plan cost of ₹{initial_total:,} exceeded the budget of ₹{constraints.budget:,} by ₹{initial_total - constraints.budget:,}."

            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="EVALUATION",
                    action="Evaluate budget constraint",
                    observation={"budget_exceeded": True, "over_budget_by": initial_total - constraints.budget},
                    evaluation=f"FAIL: Budget exceeded by ₹{initial_total - constraints.budget:,}",
                    reasoning="The initial plan violates the budget constraint. Triggering autonomous re-planning to seek lower-cost alternatives.",
                )
            )
            step_count += 1

            # Re-planning strategy:
            # First attempt: Switch to Train if Flight was used
            # Second attempt: Switch to Budget Hotel if Comfort/Premium was used
            # Third attempt: Switch to Bus
            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="RE_PLANNING",
                    action="Search for cheaper transport and hotel options to satisfy budget",
                    observation={"action": "Optimizing selection for lower cost"},
                    evaluation="IN_PROGRESS: Evaluating alternative combinations",
                    reasoning="Agent autonomously decides to downgrade transport and/or hotel tier to respect user's financial constraint.",
                )
            )
            step_count += 1

            # Candidate alternatives
            cheaper_options = []
            for t in transport_data["options"]:
                for h in hotel_data["options"]:
                    t_cost = t["price"] * 2
                    h_cost = h["price_per_night"] * nights
                    tot = calculate_budget(t_cost, h_cost, activities_total)
                    if tot <= constraints.budget:
                        cheaper_options.append((tot, t, h, t_cost, h_cost))

            if cheaper_options:
                # Pick the highest quality option that is still within budget (sorted by cost descending or quality)
                # Let's sort by cost descending (best comfort that fits budget)
                cheaper_options.sort(key=lambda x: x[0], reverse=True)
                final_total, final_transport, final_hotel, final_transport_cost, final_hotel_cost = cheaper_options[0]

                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="TOOL_EXECUTION",
                        action=f"calculate_budget(transport={final_transport_cost}, hotel={final_hotel_cost}, activities={activities_total})",
                        observation={
                            "revised_transport": f"{final_transport['type']} (₹{final_transport_cost})",
                            "revised_hotel": f"{final_hotel['name']} (₹{final_hotel_cost})",
                            "new_total": final_total,
                            "within_budget": True,
                        },
                        evaluation="PASS: Re-planned trip successfully meets the budget constraint.",
                        reasoning=(
                            f"Re-planned by switching to {final_transport['type']} (₹{final_transport_cost}) "
                            f"and {final_hotel['name']} (₹{final_hotel_cost}). "
                            f"New total ₹{final_total:,} is within the ₹{constraints.budget:,} budget."
                        ),
                    )
                )
                step_count += 1
            else:
                # Fallback to lowest possible options
                final_transport = transport_data["options"][0]  # Bus
                final_hotel = hotel_data["options"][0]  # Budget Hotel
                final_transport_cost = final_transport["price"] * 2
                final_hotel_cost = final_hotel["price_per_night"] * nights
                final_total = calculate_budget(final_transport_cost, final_hotel_cost, activities_total)

        # 8. Tool Execution: create_itinerary
        itinerary = create_itinerary(constraints.destination, constraints.duration_days)
        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="TOOL_EXECUTION",
                action=f"create_itinerary(destination='{constraints.destination}', duration={constraints.duration_days})",
                observation=itinerary,
                evaluation="SUCCESS: Day-by-day itinerary constructed.",
                reasoning=f"Created an engaging {constraints.duration_days}-day itinerary balanced with sightseeing, relaxation, and local culture.",
            )
        )
        step_count += 1

        # 9. Human-in-the-Loop Gating
        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="HUMAN_APPROVAL",
                action="Halt autonomous execution and request human authorization",
                observation={
                    "status": "awaiting_approval",
                    "trip_id": trip_id,
                    "total_cost": final_total,
                    "action_required": "Human must approve or reject plan before booking is authorized.",
                },
                evaluation="PENDING: Awaiting human authorization.",
                reasoning="Per safety policy, the agent prepares the complete plan but requires explicit human approval before any final authorized action.",
            )
        )

        final_plan_data = {
            "destination": constraints.destination,
            "origin": constraints.origin,
            "duration_days": constraints.duration_days,
            "nights": nights,
            "transport": {
                "type": final_transport["type"],
                "price_per_way": final_transport["price"],
                "round_trip_cost": final_transport["price"] * 2,
                "details": final_transport.get("details", ""),
            },
            "hotel": {
                "name": final_hotel["name"],
                "tier": final_hotel.get("tier", "comfort"),
                "price_per_night": final_hotel["price_per_night"],
                "nights": nights,
                "total_hotel_cost": final_hotel["price_per_night"] * nights,
                "amenities": final_hotel.get("amenities", []),
            },
            "itinerary": itinerary,
            "breakdown": {
                "transport": final_transport["price"] * 2,
                "hotel": final_hotel["price_per_night"] * nights,
                "activities": activities_total,
            },
            "total_cost": final_total,
        }

        response_data = {
            "trip_id": trip_id,
            "goal": goal_desc,
            "constraints": {
                "origin": constraints.origin,
                "destination": constraints.destination,
                "duration_days": constraints.duration_days,
                "budget": constraints.budget,
                "preferences": constraints.preferences,
            },
            "plan": initial_plan,
            "execution_steps": [s.dict() for s in step_logs],
            "replanned": replanned,
            "replan_reason": replan_reason,
            "final_plan": final_plan_data,
            "total_cost": final_total,
            "status": "awaiting_approval",
            "human_approval_required": True,
        }

        # Store in memory
        memory_store.save_trip(trip_id, response_data)

        return TravelResponse(**response_data)


# Global agent instance
travel_agent = TravelAgent()
