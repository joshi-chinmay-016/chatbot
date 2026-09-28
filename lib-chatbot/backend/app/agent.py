"""
Autonomous Library Agent implementation.
Demonstrates the full agent lifecycle:
Goal Understanding -> Planning -> Reasoning -> Tool Selection ->
Tool Execution -> Observation -> Evaluation -> (Re-planning if needed) ->
Human Approval -> Authorized Action.
"""

import os
import re
import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

# Load .env searching parent hierarchies
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
    ChatResponse,
    Book,
)
from .tools import (
    list_all_books,
    search_books,
    get_book_details,
    prepare_borrow,
    prepare_return,
    recommend_books,
    get_library_stats,
)
from .memory import memory_store


class LibraryAgent:
    """
    Autonomous Library Agent demonstrating Agentic AI workflows.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client: Optional[genai.Client] = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[Library Agent Warning] Failed to initialize Gemini client: {e}")
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
            print(f"[Library Agent LLM Error] Gemini call failed: {e}")
            return None

    def _extract_intent(self, message: str) -> Dict[str, Any]:
        """
        Extracts action_type, target_book, and topic using Gemini with regex fallback.
        """
        prompt = f"""
You are the parser for a university library agent.
Extract student intent from this query: "{message}"

Output JSON with keys:
- "action_type": one of ["borrow", "return", "recommend", "search", "stats", "general"]
- "target_book": exact book title if mentioned or null
- "category_or_topic": subject/field/category mentioned or null
- "student_goal": clear sentence describing user goal

Known library catalog titles:
- Python Crash Course
- Clean Code
- Hands-On Machine Learning
- Artificial Intelligence: A Modern Approach
- Introduction to Algorithms
- Database System Concepts
- Computer Networking
- The Data Science Handbook
- Learning Web Design
- Atomic Habits

Return ONLY valid raw JSON, without markdown fences.
"""
        extracted = None
        llm_out = self._call_gemini(prompt)
        if llm_out:
            try:
                clean = llm_out.strip().replace("```json", "").replace("```", "").strip()
                extracted = json.loads(clean)
            except Exception:
                pass

        if not extracted:
            extracted = self._fallback_parse(message)

        return extracted

    def _fallback_parse(self, message: str) -> Dict[str, Any]:
        """Deterministic regex parsing fallback."""
        msg_l = message.lower()
        known_titles = [
            "Python Crash Course",
            "Clean Code",
            "Hands-On Machine Learning",
            "Artificial Intelligence: A Modern Approach",
            "Introduction to Algorithms",
            "Database System Concepts",
            "Computer Networking",
            "The Data Science Handbook",
            "Learning Web Design",
            "Atomic Habits"
        ]

        # Detect target title
        target = None
        for t in known_titles:
            if t.lower() in msg_l:
                target = t
                break
        if not target:
            # Partial match keywords
            if "python" in msg_l:
                target = "Python Crash Course"
            elif "clean code" in msg_l:
                target = "Clean Code"
            elif "machine learning" in msg_l:
                target = "Hands-On Machine Learning"
            elif "algorithm" in msg_l:
                target = "Introduction to Algorithms"
            elif "database" in msg_l or "sql" in msg_l:
                target = "Database System Concepts"
            elif "network" in msg_l:
                target = "Computer Networking"
            elif "data science" in msg_l:
                target = "The Data Science Handbook"
            elif "web" in msg_l or "html" in msg_l:
                target = "Learning Web Design"
            elif "atomic" in msg_l or "habit" in msg_l:
                target = "Atomic Habits"

        # Detect action type
        if any(w in msg_l for w in ["borrow", "issue", "take", "checkout", "get", "read"]):
            action_type = "borrow"
        elif any(w in msg_l for w in ["return", "give back", "deposit", "returned"]):
            action_type = "return"
        elif any(w in msg_l for w in ["recommend", "suggest", "which book", "what can i read"]):
            action_type = "recommend"
        elif any(w in msg_l for w in ["search", "find", "have", "available", "look up", "list"]):
            action_type = "search"
        elif any(w in msg_l for w in ["stats", "how many", "statistics", "count", "status"]):
            action_type = "stats"
        else:
            action_type = "general" if not target else "search"

        # Topic detection
        topic = None
        for cat in ["Programming", "Software Engineering", "Machine Learning", "AI", "Algorithms", "Database", "Networking", "Data Science", "Web Development", "Self Help"]:
            if cat.lower() in msg_l:
                topic = cat
                break

        return {
            "action_type": action_type,
            "target_book": target,
            "category_or_topic": topic,
            "student_goal": f"Perform {action_type} for '{target or topic or 'library collection'}'"
        }

    def run(self, message: str, student_id: str = "student-demo", preferences: Optional[Dict[str, Any]] = None) -> ChatResponse:
        """
        Main autonomous agent lifecycle loop.
        """
        tx_id = f"tx-{uuid.uuid4().hex[:8]}"
        step_logs: List[StepLog] = []
        step_count = 1

        # 1. Goal Understanding
        intent = self._extract_intent(message)
        action_type = intent.get("action_type", "general")
        target_book = intent.get("target_book")
        topic = intent.get("category_or_topic")
        goal = intent.get("student_goal", f"Fulfill library request: {message}")

        step_logs.append(
            StepLog(
                step_number=step_count,
                phase="GOAL_UNDERSTANDING",
                action="Parse student inquiry and determine intended library operation",
                observation={
                    "intent": action_type,
                    "target_book": target_book,
                    "topic_filter": topic,
                    "student_id": student_id,
                },
                evaluation="SUCCESS: Extracted student goal and target entities.",
                reasoning=f"Identified goal: '{goal}'. Identified operation: '{action_type}'.",
            )
        )
        step_count += 1

        replanned = False
        replan_reason = None
        alternative_book = None
        matching_books: List[Book] = []
        reply = ""
        human_approval_required = False
        status = "completed"

        # -------------------------------------------------------------
        # BRANCH: BORROW ACTION
        # -------------------------------------------------------------
        if action_type == "borrow":
            # 2. Planning
            plan = [
                f"1. Query library records for '{target_book or 'requested book'}'",
                "2. Evaluate book availability and student borrowing quota",
                "3. If unavailable, trigger Autonomous Re-planning to find suitable in-stock alternatives",
                "4. Prepare loan transaction record",
                "5. Pause and request human authorization before booking",
            ]
            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="PLANNING",
                    action="Formulate multi-step loan verification plan",
                    observation={"plan_steps": plan},
                    evaluation="Plan formulated and ready for tool execution.",
                    reasoning="Loan transactions require deterministic verification and human authorization gating.",
                )
            )
            step_count += 1

            # 3. Tool Execution: Search/Check Book
            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="TOOL_EXECUTION",
                    action=f"Call tool: get_book_details(title='{target_book}')",
                    observation=None,
                    evaluation="Executing catalog lookup.",
                    reasoning="Verifying title presence and real-time availability in books.json.",
                )
            )

            book = get_book_details(target_book) if target_book else None
            step_logs[-1].observation = book
            step_count += 1

            if not book:
                # Book not in catalog: search for alternatives
                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="EVALUATION",
                        action="Evaluate catalog search result",
                        observation={"found": False},
                        evaluation="FAIL: Requested book is not listed in CMRIT library catalog.",
                        reasoning="Must trigger search for related books.",
                    )
                )
                step_count += 1

                recs = recommend_books(topic or message, only_available=True)
                matching_books = [Book(**b) for b in recs]
                reply = f"I could not locate '{target_book}' in our catalog. Here are currently available recommendations in related subjects: " + ", ".join([b['title'] for b in recs[:3]])
                return ChatResponse(
                    transaction_id=tx_id,
                    goal=goal,
                    action_type="search",
                    target_book=target_book,
                    alternative_book=None,
                    plan=plan,
                    execution_steps=step_logs,
                    replanned=False,
                    replan_reason=None,
                    reply=reply,
                    matching_books=matching_books,
                    status="completed",
                    human_approval_required=False,
                )

            # 4. Evaluation of Constraint (Availability)
            if not book["available"]:
                # --- CONSTRAINT VIOLATION & RE-PLANNING TRIGGER ---
                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="EVALUATION",
                        action="Check book availability constraint",
                        observation={"title": book["title"], "available": False},
                        evaluation="FAIL: Constraint Violation. Book is currently checked out by another student.",
                        reasoning=f"'{book['title']}' is marked as unavailable. Autonomously initiating Re-Planning stage to discover viable alternatives.",
                    )
                )
                step_count += 1

                # Re-Planning Stage
                replanned = True
                replan_reason = f"Requested book '{book['title']}' is currently unavailable. Autonomously discovered available alternative in related category '{book['category']}'."

                # Search for available alternatives in same or related category
                alternatives = memory_store.get_books_by_category(book["category"], only_available=True)
                if not alternatives:
                    # Broaden search to general available programming/tech books
                    alternatives = [b for b in memory_store.get_all_books() if b["available"]]

                selected_alt = alternatives[0] if alternatives else None
                alternative_book = selected_alt["title"] if selected_alt else None

                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="RE_PLANNING",
                        action=f"Execute tool: recommend_books(category='{book['category']}', only_available=True)",
                        observation={"alternatives_found": [b["title"] for b in alternatives]},
                        evaluation=f"SUCCESS: Located alternative '{alternative_book}' which is in stock.",
                        reasoning=f"Substituted unavailable book with '{alternative_book}' ({selected_alt['category'] if selected_alt else 'General'}).",
                    )
                )
                step_count += 1

                if selected_alt:
                    prep = prepare_borrow(student_id, selected_alt["title"])
                    tx_id = prep.get("transaction_id", tx_id)
                    matching_books = [Book(**selected_alt), Book(**book)]

                    step_logs.append(
                        StepLog(
                            step_number=step_count,
                            phase="ACTION",
                            action=f"Prepare loan record for alternative book '{selected_alt['title']}'",
                            observation=prep,
                            evaluation="PASS: Alternative loan prepared. Transitioning to awaiting_approval.",
                            reasoning="Safety policy: Human authorization required before modifying library records.",
                        )
                    )
                    step_count += 1

                    human_approval_required = True
                    status = "awaiting_approval"
                    reply = (
                        f"Notice: '{book['title']}' is currently borrowed by another student. "
                        f"I autonomously re-planned and found an available substitute: '{selected_alt['title']}' by {selected_alt['author']} ({selected_alt['category']}). "
                        f"Please approve below to confirm this checkout."
                    )
            else:
                # Constraint Evaluation PASS: Book is available!
                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="EVALUATION",
                        action="Check book availability constraint",
                        observation={"title": book["title"], "available": True},
                        evaluation="PASS: Book is currently available on the shelf.",
                        reasoning="Constraint satisfied. Ready to create pending loan transaction.",
                    )
                )
                step_count += 1

                prep = prepare_borrow(student_id, book["title"])
                tx_id = prep.get("transaction_id", tx_id)
                matching_books = [Book(**book)]

                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="ACTION",
                        action=f"Prepare loan record for '{book['title']}'",
                        observation=prep,
                        evaluation="PASS: Loan record prepared. Halting for human authorization.",
                        reasoning="Safety rule: Library records cannot be altered without student confirmation.",
                    )
                )
                step_count += 1

                human_approval_required = True
                status = "awaiting_approval"
                reply = (
                    f"'{book['title']}' by {book['author']} is available in {book['category']}! "
                    f"A pending borrow transaction has been prepared for {student_id}. "
                    f"Please confirm to authorize this checkout."
                )

        # -------------------------------------------------------------
        # BRANCH: RETURN ACTION
        # -------------------------------------------------------------
        elif action_type == "return":
            plan = [
                f"1. Locate '{target_book or 'book'}' in library database",
                "2. Verify book is currently checked out",
                "3. Prepare return transaction",
                "4. Seek human approval to confirm check-in",
            ]
            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="PLANNING",
                    action="Formulate book return process",
                    observation={"plan_steps": plan},
                    evaluation="Ready to process return verification.",
                    reasoning="Returns update library inventory and student loan records.",
                )
            )
            step_count += 1

            book = get_book_details(target_book) if target_book else None
            if not book:
                reply = f"Could not find record for '{target_book}' to process return."
            elif book["available"]:
                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="EVALUATION",
                        action="Verify checkout status for return",
                        observation=book,
                        evaluation="FAIL: Book is already recorded as present on shelf.",
                        reasoning="Cannot return a book that is not marked as borrowed.",
                    )
                )
                step_count += 1
                reply = f"'{book['title']}' is already marked as available in the library."
                matching_books = [Book(**book)]
            else:
                prep = prepare_return(student_id, book["title"])
                tx_id = prep.get("transaction_id", tx_id)
                matching_books = [Book(**book)]

                step_logs.append(
                    StepLog(
                        step_number=step_count,
                        phase="ACTION",
                        action=f"Prepare return record for '{book['title']}'",
                        observation=prep,
                        evaluation="PASS: Return record ready for authorization.",
                        reasoning="Human confirmation required before inventory check-in.",
                    )
                )
                step_count += 1
                human_approval_required = True
                status = "awaiting_approval"
                reply = f"Ready to check in '{book['title']}'. Please authorize this return."

        # -------------------------------------------------------------
        # BRANCH: RECOMMENDATION / SEARCH
        # -------------------------------------------------------------
        elif action_type in ["recommend", "search"]:
            plan = [
                f"1. Query catalog for matches on keyword/category '{topic or target_book or message}'",
                "2. Filter for availability status",
                "3. Formulate curated list and present to student",
            ]
            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="PLANNING",
                    action="Formulate catalog search & recommendation query",
                    observation={"plan": plan},
                    evaluation="Plan active.",
                    reasoning="Using deterministic search tool with semantic fallback.",
                )
            )
            step_count += 1

            search_query = topic or target_book or message
            results = recommend_books(search_query, only_available=False)
            if not results:
                results = list_all_books()

            matching_books = [Book(**b) for b in results]

            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="TOOL_EXECUTION",
                    action=f"Call tool: recommend_books('{search_query}')",
                    observation={"results_count": len(results), "titles": [b["title"] for b in results]},
                    evaluation="SUCCESS: Matching books retrieved.",
                    reasoning=f"Found {len(results)} books corresponding to query.",
                )
            )
            step_count += 1

            avail_count = sum(1 for b in results if b["available"])
            reply = f"Found {len(results)} books ({avail_count} currently available on shelves). Check the 3D shelves for live visual status!"

        # -------------------------------------------------------------
        # BRANCH: STATS / GENERAL
        # -------------------------------------------------------------
        else:
            stats = get_library_stats()
            matching_books = [Book(**b) for b in list_all_books()]
            plan = ["1. Query aggregate library statistics", "2. Present live counts to user"]
            step_logs.append(
                StepLog(
                    step_number=step_count,
                    phase="TOOL_EXECUTION",
                    action="Call tool: get_library_stats()",
                    observation=stats,
                    evaluation="SUCCESS: Retrieved library metrics.",
                    reasoning="Generated real-time breakdown of catalog inventory.",
                )
            )
            step_count += 1
            reply = (
                f"CMRIT Library Status: {stats['total_books']} total books, "
                f"{stats['available_count']} available, {stats['borrowed_count']} currently borrowed across "
                f"{len(stats['categories'])} technical domains."
            )

        return ChatResponse(
            transaction_id=tx_id,
            goal=goal,
            action_type=action_type,
            target_book=target_book,
            alternative_book=alternative_book,
            plan=plan if "plan" in locals() else ["1. Answer student question"],
            execution_steps=step_logs,
            replanned=replanned,
            replan_reason=replan_reason,
            reply=reply,
            matching_books=matching_books,
            status=status,
            human_approval_required=human_approval_required,
        )


# Global singleton instance
library_agent = LibraryAgent()
