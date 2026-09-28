"""
FastAPI application for the Autonomous Library Agent.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from .schemas import (
    Book,
    ChatRequest,
    ChatResponse,
    ApprovalRequest,
    ApprovalResponse,
    LibraryStats,
)
from .agent import library_agent
from .memory import memory_store

app = FastAPI(
    title="Autonomous Library Agent API",
    description="Backend service demonstrating the autonomous library agent lifecycle with interactive 3D frontend support.",
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


@app.get("/api/library/health")
def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "ok",
        "service": "cmrit-library-agent",
        "gemini_configured": bool(library_agent.api_key),
    }


@app.get("/api/library/books", response_model=List[Book])
def get_all_books():
    """Returns all books with 3D shelf positioning and availability status."""
    return memory_store.get_all_books()


@app.get("/api/library/stats", response_model=LibraryStats)
def get_stats():
    """Returns real-time inventory statistics and domain distributions."""
    return memory_store.get_stats()


@app.post("/api/library/chat", response_model=ChatResponse)
def handle_chat(request: ChatRequest):
    """
    Main endpoint: runs the autonomous library agent loop.
    Understands goal, plans, executes tools, evaluates constraints,
    autonomously re-plans on constraint violations, and halts for human approval.
    """
    try:
        response = library_agent.run(
            message=request.message,
            student_id=request.student_id or "student-demo",
            preferences=request.preferences,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Library Agent error: {str(e)}")


@app.post("/api/library/approve", response_model=ApprovalResponse)
def handle_approval(request: ApprovalRequest):
    """
    Human-in-the-loop endpoint: receives user authorization decision.
    Only after approval is the loan or return committed to books.json.
    """
    tx = memory_store.get_transaction(request.transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found or expired.")

    result = memory_store.commit_transaction(request.transaction_id, request.action)
    if not result:
        raise HTTPException(status_code=400, detail="Unable to process transaction.")

    updated_book_dict = memory_store.find_book_by_title(tx["book_title"])
    updated_book = Book(**updated_book_dict) if updated_book_dict else None

    if request.action.lower() == "approve":
        msg = f"Transaction approved! {result.get('authorized_action', '')}"
    else:
        msg = "Transaction rejected by user. No library records were altered."

    return ApprovalResponse(
        transaction_id=request.transaction_id,
        status=result["status"],
        message=msg,
        authorized_action=result.get("authorized_action"),
        updated_book=updated_book,
    )


@app.post("/api/library/reset")
def reset_library():
    """Resets all loans and restores initial books.json state."""
    memory_store.reset()
    return {"status": "success", "message": "Library catalog and transaction memory reset."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
