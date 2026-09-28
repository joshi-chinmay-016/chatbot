"""
Automated verification tests for the Autonomous Study Assistant backend.
Tests:
1. Health check endpoint
2. Wikipedia search tool
3. Scientific calculate tool
4. Study notes storage & retrieval
5. Multi-step autonomous agent reasoning loop
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.tools import search_wikipedia, calculate, save_study_notes, list_study_notes, get_study_note

client = TestClient(app)


def test_health():
    print("\n--- Test 1: Health Check ---")
    res = client.get("/api/study/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "agentic-study-assistant"
    print(f"Health OK: {data}")


def test_wikipedia_tool():
    print("\n--- Test 2: Wikipedia Tool ---")
    summary = search_wikipedia("Isaac Newton")
    assert len(summary) > 20
    assert "Newton" in summary or "Isaac" in summary
    print(f"Wikipedia Tool OK. Retrieved {len(summary)} characters.")


def test_calculate_tool():
    print("\n--- Test 3: Math Calculator Tool ---")
    res1 = calculate("1643 + 300")
    assert res1 == "1943", f"Expected 1943, got {res1}"

    res2 = calculate("sqrt(144) * 5")
    assert float(res2) == 60.0, f"Expected 60.0, got {res2}"

    res3 = calculate("2^8")
    assert res3 == "256", f"Expected 256, got {res3}"
    print("Calculate Tool OK: 1643+300=1943, sqrt(144)*5=60.0, 2^8=256.")


def test_notes_storage():
    print("\n--- Test 4: Notes Storage Tool ---")
    test_content = "# Test Note\n\n- Key fact 1\n- Key fact 2"
    save_msg = save_study_notes("test_demo.md", test_content)
    assert "Successfully saved" in save_msg

    # Verify read
    read_back = get_study_note("test_demo.md")
    assert read_back == test_content

    # Verify list
    notes = list_study_notes()
    filenames = [n["filename"] for n in notes]
    assert "test_demo.md" in filenames
    print(f"Notes Storage OK. Found {len(notes)} notes on disk.")


def test_autonomous_agent_cycle():
    print("\n--- Test 5: Autonomous Multi-Step Agent Cycle ---")
    task = (
        "Research Isaac Newton on Wikipedia, calculate what year it was 300 years after his birth (1643), "
        "and save a 3-bullet revision note to newton_facts.md"
    )
    res = client.post("/api/study/chat", json={"message": task, "max_iterations": 5})
    assert res.status_code == 200, f"Chat failed: {res.text}"
    data = res.json()

    print(f"Agent Goal: {data['goal']}")
    print(f"Steps recorded: {len(data['execution_steps'])}")
    print(f"Tools used: {data['tools_used']}")
    print(f"Saved files: {data['saved_files']}")

    assert len(data["execution_steps"]) >= 2
    assert len(data["reply"]) > 10

    # Verify note was written to disk
    note = get_study_note("newton_facts.md")
    assert note is not None
    assert len(note) > 10
    print("Multi-step Autonomous Cycle SUCCESS!")


if __name__ == "__main__":
    test_health()
    test_wikipedia_tool()
    test_calculate_tool()
    test_notes_storage()
    test_autonomous_agent_cycle()
    print("\n ALL 5 STUDY ASSISTANT TESTS PASSED SUCCESSFULLY!")
