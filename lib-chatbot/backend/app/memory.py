"""
In-memory and file-backed persistence for CMRIT Library Agent.
Tracks:
- Book catalog (synced with books.json)
- Pending and historical transactions
- Active student loans and borrowing limits
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import time

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "books.json"

DEFAULT_BOOKS = [
    {"title": "Python Crash Course", "author": "Eric Matthes", "category": "Programming", "available": True},
    {"title": "Clean Code", "author": "Robert C. Martin", "category": "Software Engineering", "available": False},
    {"title": "Hands-On Machine Learning", "author": "Aurélien Géron", "category": "Machine Learning", "available": True},
    {"title": "Artificial Intelligence: A Modern Approach", "author": "Stuart Russell", "category": "AI", "available": True},
    {"title": "Introduction to Algorithms", "author": "Thomas Cormen", "category": "Algorithms", "available": False},
    {"title": "Database System Concepts", "author": "Abraham Silberschatz", "category": "Database", "available": True},
    {"title": "Computer Networking", "author": "James Kurose", "category": "Networking", "available": True},
    {"title": "The Data Science Handbook", "author": "Field Cady", "category": "Data Science", "available": False},
    {"title": "Learning Web Design", "author": "Jennifer Robbins", "category": "Web Development", "available": True},
    {"title": "Atomic Habits", "author": "James Clear", "category": "Self Help", "available": True}
]


class LibraryMemory:
    def __init__(self):
        self.transactions: Dict[str, Dict[str, Any]] = {}
        self.student_loans: Dict[str, List[str]] = {}
        self.max_loans_per_student = 3
        self._load_catalog()

    def _load_catalog(self) -> None:
        """Loads books from books.json, initializing shelf coordinates."""
        if DATA_FILE.exists():
            try:
                raw_books = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            except Exception:
                raw_books = DEFAULT_BOOKS
        else:
            raw_books = DEFAULT_BOOKS

        self.books: List[Dict[str, Any]] = []
        # Assign shelf positions: 2 rows of 5 books
        for idx, b in enumerate(raw_books):
            book_copy = dict(b)
            book_copy["id"] = f"b-{idx + 1}"
            book_copy["shelf_row"] = 1 if idx < 5 else 0
            book_copy["shelf_col"] = idx % 5
            self.books.append(book_copy)

    def save_catalog(self) -> None:
        """Writes current book states back to books.json while keeping clean structure."""
        out_data = []
        for b in self.books:
            out_data.append({
                "title": b["title"],
                "author": b["author"],
                "category": b["category"],
                "available": bool(b["available"])
            })
        DATA_FILE.write_text(json.dumps(out_data, indent=2), encoding="utf-8")

    def get_all_books(self) -> List[Dict[str, Any]]:
        return list(self.books)

    def find_book_by_title(self, title: str) -> Optional[Dict[str, Any]]:
        title_lower = title.strip().lower()
        for b in self.books:
            if b["title"].lower() == title_lower:
                return b
        # Partial match if exact doesn't match
        for b in self.books:
            if title_lower in b["title"].lower():
                return b
        return None

    def search_books(self, query: str) -> List[Dict[str, Any]]:
        q = query.strip().lower()
        if not q:
            return self.get_all_books()
        return [
            b for b in self.books
            if q in b["title"].lower() or q in b["author"].lower() or q in b["category"].lower()
        ]

    def get_books_by_category(self, category: str, only_available: bool = False) -> List[Dict[str, Any]]:
        cat_lower = category.strip().lower()
        results = [
            b for b in self.books
            if cat_lower in b["category"].lower()
        ]
        if only_available:
            results = [b for b in results if b["available"]]
        return results

    def save_transaction(self, tx_id: str, data: Dict[str, Any]) -> None:
        data["timestamp"] = time.time()
        self.transactions[tx_id] = data

    def get_transaction(self, tx_id: str) -> Optional[Dict[str, Any]]:
        return self.transactions.get(tx_id)

    def commit_transaction(self, tx_id: str, action: str) -> Optional[Dict[str, Any]]:
        tx = self.transactions.get(tx_id)
        if not tx:
            return None

        if action.lower() == "approve":
            book = self.find_book_by_title(tx["book_title"])
            if not book:
                return None

            student_id = tx.get("student_id", "student-demo")
            if student_id not in self.student_loans:
                self.student_loans[student_id] = []

            if tx["type"] == "borrow":
                book["available"] = False
                if book["title"] not in self.student_loans[student_id]:
                    self.student_loans[student_id].append(book["title"])
                tx["status"] = "approved"
                tx["authorized_action"] = f"Book '{book['title']}' checked out to {student_id}."
            elif tx["type"] == "return":
                book["available"] = True
                if book["title"] in self.student_loans[student_id]:
                    self.student_loans[student_id].remove(book["title"])
                tx["status"] = "approved"
                tx["authorized_action"] = f"Book '{book['title']}' returned to library catalog."

            self.save_catalog()
            return tx
        elif action.lower() == "reject":
            tx["status"] = "rejected"
            tx["authorized_action"] = "Transaction rejected by user."
            return tx
        return None

    def get_stats(self) -> Dict[str, Any]:
        total = len(self.books)
        available = sum(1 for b in self.books if b["available"])
        borrowed = total - available
        cat_counts: Dict[str, int] = {}
        for b in self.books:
            cat = b["category"]
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        recent = sorted(self.transactions.values(), key=lambda x: x.get("timestamp", 0), reverse=True)[:5]
        return {
            "total_books": total,
            "available_count": available,
            "borrowed_count": borrowed,
            "categories": cat_counts,
            "recent_transactions": recent,
        }

    def reset(self) -> None:
        """Resets all loans and restores default catalog state."""
        self.transactions.clear()
        self.student_loans.clear()
        self.books = []
        for idx, b in enumerate(DEFAULT_BOOKS):
            book_copy = dict(b)
            book_copy["id"] = f"b-{idx + 1}"
            book_copy["shelf_row"] = 1 if idx < 5 else 0
            book_copy["shelf_col"] = idx % 5
            self.books.append(book_copy)
        self.save_catalog()


# Global singleton instance
memory_store = LibraryMemory()
