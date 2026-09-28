from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TravelRequest(BaseModel):
    message: str = Field(..., description="User travel request string")
    preferences: Optional[Dict[str, Any]] = Field(default=None, description="Optional user preferences")


class ApprovalRequest(BaseModel):
    trip_id: str = Field(..., description="ID of the trip being approved or rejected")
    action: str = Field(..., description="'approve' or 'reject'")


class StepLog(BaseModel):
    step_number: int
    phase: str
    action: str
    observation: Optional[Any] = None
    evaluation: Optional[str] = None
    reasoning: Optional[str] = None


class TravelConstraints(BaseModel):
    origin: str
    destination: str
    duration_days: int
    budget: int
    preferences: Dict[str, Any] = Field(default_factory=dict)


class FinalPlan(BaseModel):
    destination: str
    origin: str
    duration_days: int
    transport: Dict[str, Any]
    hotel: Dict[str, Any]
    itinerary: List[Dict[str, Any]]
    breakdown: Dict[str, int]
    total_cost: int


class TravelResponse(BaseModel):
    trip_id: str
    goal: str
    constraints: Dict[str, Any]
    plan: List[str]
    execution_steps: List[StepLog]
    replanned: bool
    replan_reason: Optional[str] = None
    final_plan: Dict[str, Any]
    total_cost: int
    status: str
    human_approval_required: bool


class ApprovalResponse(BaseModel):
    trip_id: str
    status: str
    message: str
    authorized_action: Optional[str] = None
