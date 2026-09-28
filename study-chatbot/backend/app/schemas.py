from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class StudyNote(BaseModel):
    filename: str
    title: str
    preview: str
    size_bytes: int
    modified_time: float


class NoteContent(BaseModel):
    filename: str
    content: str


class SaveNoteRequest(BaseModel):
    filename: str = Field(..., description="Filename, e.g. 'physics_laws.md'")
    content: str = Field(..., description="Markdown or text content")


class StepLog(BaseModel):
    step_number: int
    phase: str
    action: str
    tool_name: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None
    observation: Optional[Any] = None
    evaluation: Optional[str] = None
    reasoning: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or autonomous study task")
    student_name: Optional[str] = Field(default="Student", description="User display name")
    max_iterations: Optional[int] = Field(default=5, description="Maximum agent reasoning steps")


class ChatResponse(BaseModel):
    goal: str
    reply: str
    execution_steps: List[StepLog]
    saved_files: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    calculations: List[Dict[str, str]] = Field(default_factory=list)
    wikipedia_sources: List[str] = Field(default_factory=list)
    status: str = "completed"


class CalculateRequest(BaseModel):
    expression: str = Field(..., description="Mathematical or scientific expression, e.g. 'sqrt(144) * 5'")


class CalculateResponse(BaseModel):
    expression: str
    result: str
    success: bool
    error: Optional[str] = None


class SearchRequest(BaseModel):
    query: str = Field(..., description="Topic or keywords to search on Wikipedia")


class SearchResponse(BaseModel):
    query: str
    results: str
