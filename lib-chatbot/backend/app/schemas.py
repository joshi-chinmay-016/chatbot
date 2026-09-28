from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class Book(BaseModel):
    title: str
    author: str
    category: str
    available: bool
    id: Optional[str] = None
    shelf_row: Optional[int] = None
    shelf_col: Optional[int] = None


class ChatRequest(BaseModel):
    message: str = Field(..., description="Natural language query or command from student")
    student_id: Optional[str] = Field(default="student-demo", description="Student ID or user session")
    preferences: Optional[Dict[str, Any]] = Field(default=None, description="Optional preferences")


class StepLog(BaseModel):
    step_number: int
    phase: str
    action: str
    observation: Optional[Any] = None
    evaluation: Optional[str] = None
    reasoning: Optional[str] = None


class ChatResponse(BaseModel):
    transaction_id: str
    goal: str
    action_type: str
    target_book: Optional[str] = None
    alternative_book: Optional[str] = None
    plan: List[str]
    execution_steps: List[StepLog]
    replanned: bool
    replan_reason: Optional[str] = None
    reply: str
    matching_books: List[Book] = Field(default_factory=list)
    status: str
    human_approval_required: bool


class ApprovalRequest(BaseModel):
    transaction_id: str = Field(..., description="ID of the pending loan or return transaction")
    action: str = Field(..., description="'approve' or 'reject'")


class ApprovalResponse(BaseModel):
    transaction_id: str
    status: str
    message: str
    authorized_action: Optional[str] = None
    updated_book: Optional[Book] = None


class LibraryStats(BaseModel):
    total_books: int
    available_count: int
    borrowed_count: int
    categories: Dict[str, int]
    recent_transactions: List[Dict[str, Any]] = Field(default_factory=list)
