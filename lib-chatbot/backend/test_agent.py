"""
Automated verification tests for the Autonomous Library Agent backend.
Tests:
1. Available Book Borrow Flow & Human Approval
2. Unavailable Book Flow with Autonomous Re-Planning
3. Book Return Flow & Human Approval
4. Health & Stats endpoints
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.memory import memory_store

client = TestClient(app)


def test_health():
    print("\n--- Test 1: Health Check ---")
    res = client.get("/api/library/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "cmrit-library-agent"
    print(f"Health OK: {data}")


def test_borrow_available_flow():
    print("\n--- Test 2: Borrow Available Book ('Python Crash Course') ---")
    memory_store.reset()

    # Step 1: Send borrow request
    req = {
        "message": "I would like to borrow Python Crash Course please",
        "student_id": "student-101"
    }
    res = client.post("/api/library/chat", json=req)
    assert res.status_code == 200, f"Chat failed: {res.text}"
    data = res.json()

    assert data["action_type"] == "borrow"
    assert data["target_book"] == "Python Crash Course"
    assert data["human_approval_required"] is True
    assert data["status"] == "awaiting_approval"
    assert data["replanned"] is False

    # Check execution trace
    phases = [s["phase"] for s in data["execution_steps"]]
    assert "GOAL_UNDERSTANDING" in phases
    assert "PLANNING" in phases
    assert "TOOL_EXECUTION" in phases
    assert "EVALUATION" in phases
    assert "ACTION" in phases
    print(f"Goal: {data['goal']}")
    print(f"Lifecycle Steps: {len(data['execution_steps'])} steps recorded.")

    # Step 2: Human Approval
    tx_id = data["transaction_id"]
    approval_res = client.post("/api/library/approve", json={"transaction_id": tx_id, "action": "approve"})
    assert approval_res.status_code == 200
    approval_data = approval_res.json()
    assert approval_data["status"] == "approved"
    assert "checked out" in approval_data["authorized_action"]

    # Verify book is now marked unavailable
    book = memory_store.find_book_by_title("Python Crash Course")
    assert book["available"] is False
    print("Approval SUCCESS: Book marked unavailable in database.")


def test_replan_unavailable_flow():
    print("\n--- Test 3: Failure Scenario & Autonomous Re-Planning ('Clean Code' is unavailable) ---")
    memory_store.reset()

    # Ensure Clean Code is unavailable
    cc = memory_store.find_book_by_title("Clean Code")
    assert cc["available"] is False

    req = {
        "message": "Can I borrow Clean Code?",
        "student_id": "student-102"
    }
    res = client.post("/api/library/chat", json=req)
    assert res.status_code == 200
    data = res.json()

    print(f"Agent Reply: {data['reply']}")
    assert data["replanned"] is True, "Agent should have triggered re-planning for unavailable book"
    assert data["alternative_book"] is not None
    assert data["replan_reason"] is not None
    assert data["human_approval_required"] is True
    assert data["status"] == "awaiting_approval"

    # Verify RE_PLANNING step exists in trace
    phases = [s["phase"] for s in data["execution_steps"]]
    assert "RE_PLANNING" in phases, f"Missing RE_PLANNING in phases: {phases}"

    replan_step = next(s for s in data["execution_steps"] if s["phase"] == "RE_PLANNING")
    print(f"Re-Planning Step Action: {replan_step['action']}")
    print(f"Alternative selected: '{data['alternative_book']}'")

    # Approve the alternative
    tx_id = data["transaction_id"]
    approval_res = client.post("/api/library/approve", json={"transaction_id": tx_id, "action": "approve"})
    assert approval_res.status_code == 200
    print("Alternative approved successfully!")


def test_return_book_flow():
    print("\n--- Test 4: Return Book Flow ---")
    memory_store.reset()

    # Clean Code is unavailable in default catalog, so return it
    req = {
        "message": "I am returning Clean Code to the library",
        "student_id": "student-103"
    }
    res = client.post("/api/library/chat", json=req)
    assert res.status_code == 200
    data = res.json()

    assert data["action_type"] == "return"
    assert data["human_approval_required"] is True
    tx_id = data["transaction_id"]

    # Approve return
    approval_res = client.post("/api/library/approve", json={"transaction_id": tx_id, "action": "approve"})
    assert approval_res.status_code == 200
    book = memory_store.find_book_by_title("Clean Code")
    assert book["available"] is True, "Book should now be marked available after return"
    print("Return flow verified successfully!")


def test_stats_and_books():
    print("\n--- Test 5: Catalog and Stats Endpoints ---")
    res_books = client.get("/api/library/books")
    assert res_books.status_code == 200
    books = res_books.json()
    assert len(books) == 10

    res_stats = client.get("/api/library/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_books"] == 10
    print(f"Stats OK: Total={stats['total_books']}, Available={stats['available_count']}, Borrowed={stats['borrowed_count']}")


if __name__ == "__main__":
    test_health()
    test_borrow_available_flow()
    test_replan_unavailable_flow()
    test_return_book_flow()
    test_stats_and_books()
    print("\n ALL 5 BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")
