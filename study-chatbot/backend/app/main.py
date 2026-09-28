"""
FastAPI application for the Autonomous Agentic Study Assistant.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from .schemas import (
    StudyNote,
    NoteContent,
    SaveNoteRequest,
    ChatRequest,
    ChatResponse,
    CalculateRequest,
    CalculateResponse,
    SearchRequest,
    SearchResponse,
)
from .agent import study_agent
from .tools import (
    search_wikipedia,
    calculate,
    save_study_notes,
    list_study_notes,
    get_study_note,
    delete_study_note,
)

app = FastAPI(
    title="Autonomous Study Assistant API",
    description="Backend service powering the autonomous agentic study assistant with Wikipedia research, math calculation, and note persistence.",
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


@app.get("/api/study/health")
def health_check():
    """Health check endpoint to verify backend service status."""
    return {
        "status": "ok",
        "service": "agentic-study-assistant",
        "groq_configured": bool(study_agent.groq_client),
        "gemini_configured": bool(study_agent.gemini_client),
    }


@app.post("/api/study/chat", response_model=ChatResponse)
def handle_chat(request: ChatRequest):
    """
    Main endpoint: runs the autonomous multi-step study agent loop.
    Executes reasoning, calls tools (search_wikipedia, calculate, save_study_notes),
    and records an execution trace for every step.
    """
    try:
        response = study_agent.run(
            user_query=request.message,
            max_iterations=request.max_iterations or 5,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Study Agent error: {str(e)}")


@app.get("/api/study/notes", response_model=List[StudyNote])
def get_all_notes():
    """Returns a list of all saved study notes in study_notes/."""
    return list_study_notes()


@app.get("/api/study/notes/{filename}", response_model=NoteContent)
def read_note(filename: str):
    """Fetches the full markdown text of a specific note."""
    content = get_study_note(filename)
    if content is None:
        raise HTTPException(status_code=404, detail=f"Note '{filename}' not found.")
    return NoteContent(filename=filename, content=content)


@app.post("/api/study/notes")
def save_note(request: SaveNoteRequest):
    """Creates or updates a study note file."""
    msg = save_study_notes(request.filename, request.content)
    return {"status": "success", "message": msg, "filename": request.filename}


@app.delete("/api/study/notes/{filename}")
def remove_note(filename: str):
    """Deletes a note file from study_notes/."""
    success = delete_study_note(filename)
    if not success:
        raise HTTPException(status_code=404, detail=f"Note '{filename}' not found.")
    return {"status": "success", "message": f"Deleted '{filename}'."}


@app.post("/api/study/calculate", response_model=CalculateResponse)
def calculate_expression(request: CalculateRequest):
    """Direct mathematical and scientific expression evaluator."""
    result = calculate(request.expression)
    is_err = "error" in result.lower()
    return CalculateResponse(
        expression=request.expression,
        result=result if not is_err else "",
        success=not is_err,
        error=result if is_err else None,
    )


@app.get("/api/study/search", response_model=SearchResponse)
def search_wiki(query: str):
    """Direct Wikipedia concept lookup."""
    results = search_wikipedia(query)
    return SearchResponse(query=query, results=results)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8002, reload=True)
