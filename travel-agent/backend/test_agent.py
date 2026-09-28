"""
Verification script for the Autonomous Travel Agent.
Tests:
1. Scenario 1: Standard successful execution under budget.
2. Scenario 2: Budget violation leading to autonomous re-planning and recovery.
3. Human-in-the-loop approval mechanism.
"""

import sys
from pathlib import Path

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add app to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.agent import travel_agent
from app.memory import memory_store


def test_scenario_1():
    print("\n" + "=" * 60)
    print("RUNNING SCENARIO 1: Standard Trip Under Budget")
    print("=" * 60)
    req = "Plan a 3-day trip to Goa from Bangalore under ₹15,000"
    res = travel_agent.run(req)

    print(f"Goal: {res.goal}")
    print(f"Duration: {res.constraints['duration_days']} days")
    print(f"Budget: ₹{res.constraints['budget']:,}")
    print(f"Replanned: {res.replanned}")
    print(f"Total Cost: ₹{res.total_cost:,}")
    print(f"Selected Transport: {res.final_plan['transport']['type']} (₹{res.final_plan['breakdown']['transport']:,})")
    print(f"Selected Hotel: {res.final_plan['hotel']['name']} (₹{res.final_plan['breakdown']['hotel']:,})")
    print(f"Activities Cost: ₹{res.final_plan['breakdown']['activities']:,}")
    print(f"Human Approval Required: {res.human_approval_required}")
    print(f"Status: {res.status}")
    print(f"Steps Executed: {len(res.execution_steps)}")

    assert res.total_cost <= res.constraints["budget"], "Scenario 1 should be within budget"
    assert res.human_approval_required is True, "Human approval must be required"
    print(">>> Scenario 1 PASSED!")
    return res


def test_scenario_2():
    print("\n" + "=" * 60)
    print("RUNNING SCENARIO 2: Failure & Re-planning Demonstration")
    print("=" * 60)
    # Asking for flights with a budget of ₹10,000 or ₹12,000 will exceed budget on initial selection
    req = "Plan a 3-day trip to Goa from Bangalore under ₹10,000 with flights"
    res = travel_agent.run(req)

    print(f"Goal: {res.goal}")
    print(f"Budget: ₹{res.constraints['budget']:,}")
    print(f"Replanned: {res.replanned}")
    print(f"Replan Reason: {res.replan_reason}")
    print(f"Total Cost: ₹{res.total_cost:,}")
    print(f"Selected Transport: {res.final_plan['transport']['type']} (₹{res.final_plan['breakdown']['transport']:,})")
    print(f"Selected Hotel: {res.final_plan['hotel']['name']} (₹{res.final_plan['breakdown']['hotel']:,})")
    print(f"Human Approval Required: {res.human_approval_required}")
    print(f"Status: {res.status}")

    assert res.replanned is True, "Scenario 2 should trigger re-planning"
    assert res.total_cost <= res.constraints["budget"], "Re-planned cost must be within budget"
    print(">>> Scenario 2 PASSED!")
    return res


def test_human_approval(trip_id: str):
    print("\n" + "=" * 60)
    print("RUNNING HUMAN APPROVAL TEST")
    print("=" * 60)
    trip = memory_store.get_trip(trip_id)
    assert trip is not None, "Trip must exist in memory"
    assert trip["status"] == "awaiting_approval", "Trip should initially be awaiting_approval"

    # Simulate approval
    authorized_action = f"Authorized booking for {trip['final_plan']['destination']}"
    memory_store.update_trip_status(trip_id, "approved", authorized_action)

    updated_trip = memory_store.get_trip(trip_id)
    assert updated_trip["status"] == "approved"
    assert "authorized_action" in updated_trip
    print(f"Trip {trip_id} status successfully updated to: {updated_trip['status']}")
    print(f"Authorized Action: {updated_trip['authorized_action']}")
    print(">>> Human Approval Test PASSED!")


if __name__ == "__main__":
    res1 = test_scenario_1()
    res2 = test_scenario_2()
    test_human_approval(res1.trip_id)
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
