"""
Deterministic library tools for the Autonomous Library Agent.
Interacts with the memory_store data layer.
"""

from typing import Any, Dict, List, Optional
import uuid
from .memory import memory_store


def list_all_books() -> List[Dict[str, Any]]:
    """Returns the full catalog of books with author, category, and availability."""
    return memory_store.get_all_books()


def search_books(query: str) -> List[Dict[str, Any]]:
    """Searches for books matching keyword in title, author, or category."""
    return memory_store.search_books(query)


def get_book_details(title: str) -> Optional[Dict[str, Any]]:
    """Retrieves detailed record for a specific book by title."""
    return memory_store.find_book_by_title(title)


def check_borrowing_eligibility(student_id: str, title: str) -> Dict[str, Any]:
    """
    Checks if student has exceeded loan limits or already borrowed the book.
    Student limit is 3 books.
    """
    loans = memory_store.student_loans.get(student_id, [])
    if len(loans) >= memory_store.max_loans_per_student:
        return {
            "eligible": False,
            "reason": f"Borrowing limit reached: Student currently holds {len(loans)} books (limit is {memory_store.max_loans_per_student}).",
            "current_loans": loans
        }
    if title.lower() in [l.lower() for l in loans]:
        return {
            "eligible": False,
            "reason": f"Student already has '{title}' checked out.",
            "current_loans": loans
        }
    return {
        "eligible": True,
        "reason": f"Student is eligible to borrow. Currently holding {len(loans)}/3 books.",
        "current_loans": loans
    }


def prepare_borrow(student_id: str, title: str) -> Dict[str, Any]:
    """
    Prepares a borrow transaction. Does NOT commit until human approval.
    """
    book = memory_store.find_book_by_title(title)
    if not book:
        return {
            "success": False,
            "error": f"Book '{title}' does not exist in library records."
        }

    if not book["available"]:
        return {
            "success": False,
            "error": f"Book '{book['title']}' is currently unavailable (borrowed by another student).",
            "book": book
        }

    eligibility = check_borrowing_eligibility(student_id, book["title"])
    if not eligibility["eligible"]:
        return {
            "success": False,
            "error": eligibility["reason"],
            "book": book
        }

    tx_id = f"tx-borrow-{uuid.uuid4().hex[:8]}"
    tx_data = {
        "transaction_id": tx_id,
        "type": "borrow",
        "student_id": student_id,
        "book_title": book["title"],
        "category": book["category"],
        "status": "awaiting_approval",
        "action_summary": f"Borrow '{book['title']}' for student '{student_id}'"
    }
    memory_store.save_transaction(tx_id, tx_data)

    return {
        "success": True,
        "transaction_id": tx_id,
        "book": book,
        "status": "awaiting_approval"
    }


def prepare_return(student_id: str, title: str) -> Dict[str, Any]:
    """
    Prepares a return transaction. Does NOT commit until human approval.
    """
    book = memory_store.find_book_by_title(title)
    if not book:
        return {
            "success": False,
            "error": f"Book '{title}' does not exist in library records."
        }

    if book["available"]:
        return {
            "success": False,
            "error": f"Book '{book['title']}' is already marked as available in the library.",
            "book": book
        }

    tx_id = f"tx-return-{uuid.uuid4().hex[:8]}"
    tx_data = {
        "transaction_id": tx_id,
        "type": "return",
        "student_id": student_id,
        "book_title": book["title"],
        "category": book["category"],
        "status": "awaiting_approval",
        "action_summary": f"Return '{book['title']}' to library shelves"
    }
    memory_store.save_transaction(tx_id, tx_data)

    return {
        "success": True,
        "transaction_id": tx_id,
        "book": book,
        "status": "awaiting_approval"
    }


def recommend_books(category_or_topic: str, only_available: bool = True) -> List[Dict[str, Any]]:
    """
    Finds books matching or related to category or keywords.
    """
    q = category_or_topic.strip().lower()
    matches = memory_store.search_books(q)
    if not matches:
        # Fallback category mappings
        synonyms = {
            "coding": "Programming",
            "python": "Programming",
            "software": "Software Engineering",
            "ml": "Machine Learning",
            "deep learning": "Machine Learning",
            "algorithms": "Algorithms",
            "dsa": "Algorithms",
            "db": "Database",
            "sql": "Database",
            "network": "Networking",
            "web": "Web Development",
            "frontend": "Web Development",
            "productivity": "Self Help",
            "habit": "Self Help"
        }
        for syn_k, cat_v in synonyms.items():
            if syn_k in q:
                matches = memory_store.get_books_by_category(cat_v, only_available)
                break

    if only_available:
        matches = [b for b in matches if b["available"]]

    return matches


def get_library_stats() -> Dict[str, Any]:
    """Retrieves current library statistics."""
    return memory_store.get_stats()
