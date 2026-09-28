"""
FastAPI application for the Autonomous Travel Agent.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    TravelRequest,
    TravelResponse,
    ApprovalRequest,
    ApprovalResponse,
)
from .agent import travel_agent
from .memory import memory_store

app = FastAPI(
    title="Autonomous Travel Agent API",
    description="Backend service demonstrating the autonomous travel agent lifecycle.",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/travel/health")
def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "ok",
        "service": "autonomous-travel-agent",
        "gemini_configured": bool(travel_agent.api_key),
    }


@app.post("/api/travel", response_model=TravelResponse)
def plan_trip(request: TravelRequest):
    """
    Main endpoint: runs the autonomous travel agent loop.
    Understands goal, plans, executes tools, evaluates constraints,
    re-plans if needed, and pauses for human approval.
    """
    try:
        response = travel_agent.run(request.message, request.preferences)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")


@app.post("/api/travel/approve", response_model=ApprovalResponse)
def handle_approval(request: ApprovalRequest):
    """
    Human-in-the-loop endpoint: receives human authorization decision.
    Only after approval is the final action marked authorized.
    """
    trip = memory_store.get_trip(request.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found in memory store.")

    action_lower = request.action.lower()
    if action_lower == "approve":
        authorized_action = (
            f"Authorized booking for {trip['final_plan']['destination']} trip: "
            f"{trip['final_plan']['transport']['type']} + {trip['final_plan']['hotel']['name']}. "
            f"Total: ₹{trip['total_cost']:,}. Execution confirmed."
        )
        memory_store.update_trip_status(request.trip_id, "approved", authorized_action)
        return ApprovalResponse(
            trip_id=request.trip_id,
            status="approved",
            message="Plan approved! The authorized booking action has been successfully confirmed.",
            authorized_action=authorized_action,
        )
    elif action_lower == "reject":
        memory_store.update_trip_status(request.trip_id, "rejected")
        return ApprovalResponse(
            trip_id=request.trip_id,
            status="rejected",
            message="Plan rejected by user. No booking action was executed.",
            authorized_action=None,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'approve' or 'reject'.")


@app.get("/api/travel/state")
def get_memory_state():
    """Returns the current in-memory state of preferences and active trip."""
    return {
        "preferences": memory_store.get_preferences(),
        "current_trip": memory_store.get_current_trip(),
    }


@app.post("/api/travel/reset")
def reset_memory():
    """Resets all in-memory travel agent state."""
    memory_store.reset()
    return {"status": "success", "message": "In-memory state reset."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
