"""
Deterministic tools for the Autonomous Study Assistant:
1. search_wikipedia: Live Wikipedia API search & summary
2. calculate: Deterministic scientific & mathematical expression evaluator
3. save_study_notes: Markdown persistence into study_notes/
4. list_study_notes: Index of all saved study guides
5. get_study_note: Read a note from disk
"""

import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

NOTES_DIR = Path(__file__).resolve().parent.parent.parent / "study_notes"
NOTES_DIR.mkdir(parents=True, exist_ok=True)


def search_wikipedia(query: str) -> str:
    """
    Searches Wikipedia and returns top article summaries for factual concepts.
    """
    headers = {"User-Agent": "AutonomousStudyBot/2.0 (student-assistant@cmrit.edu)"}
    try:
        with httpx.Client(timeout=10.0, headers=headers) as client:
            res = client.get(
                "https://en.wikipedia.org/w/api.php",
                params={"action": "query", "list": "search", "srsearch": query, "format": "json"}
            )
            data = res.json()
            search_items = data.get("query", {}).get("search", [])
            if not search_items:
                return f"No Wikipedia articles found for '{query}'."

            summaries = []
            for item in search_items[:2]:
                title = item["title"]
                r = client.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}")
                if r.status_code == 200:
                    extract = r.json().get("extract", "")
                    summaries.append(f"Title: {title}\nSummary: {extract}")

            return "\n\n".join(summaries) if summaries else "No article content available."
    except Exception as e:
        return f"Error searching Wikipedia: {str(e)}"


def calculate(expression: str) -> str:
    """
    Safely evaluates mathematical and scientific expressions.
    Supports basic arithmetic and standard math functions (sqrt, sin, cos, tan, log, log10, exp, pi, e).
    """
    safe_math = {
        "sqrt": math.sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "log": math.log,
        "log10": math.log10,
        "exp": math.exp,
        "pi": math.pi,
        "e": math.e,
        "pow": math.pow,
        "abs": abs,
        "round": round,
    }
    try:
        cleaned_expr = expression.replace("^", "**").strip()
        # Security check: only allow safe characters
        if not re.match(r"^[0-9\+\-\*\/\%\(\)\.\s\,\w\*\*]+$", cleaned_expr):
            return "Calculation error: Expression contains invalid characters."
        
        result = eval(cleaned_expr, {"__builtins__": {}}, safe_math)
        return str(result)
    except Exception as e:
        return f"Calculation error: {str(e)}"


def save_study_notes(filename: str, content: str) -> str:
    """
    Saves study notes, summaries, or flashcards into the 'study_notes' directory.
    """
    try:
        safe_name = Path(filename).name
        if not safe_name.endswith((".md", ".txt", ".json")):
            safe_name += ".md"
        filepath = NOTES_DIR / safe_name
        filepath.write_text(content, encoding="utf-8")
        return f"Successfully saved study note to 'study_notes/{safe_name}'."
    except Exception as e:
        return f"Error saving file: {str(e)}"


def list_study_notes() -> List[Dict[str, Any]]:
    """
    Lists all saved study notes in study_notes/ with metadata.
    """
    notes = []
    if not NOTES_DIR.exists():
        return notes

    for file in sorted(NOTES_DIR.glob("*.*"), key=lambda f: f.stat().st_mtime, reverse=True):
        if file.suffix.lower() in [".md", ".txt", ".json"]:
            try:
                content = file.read_text(encoding="utf-8")
                # Extract first heading or clean preview
                lines = [l.strip() for l in content.splitlines() if l.strip()]
                title = file.stem.replace("_", " ").title()
                if lines and lines[0].startswith("#"):
                    title = lines[0].lstrip("#").strip()

                preview = " ".join(lines[:3]) if lines else "Empty note"
                if len(preview) > 140:
                    preview = preview[:137] + "..."

                notes.append({
                    "filename": file.name,
                    "title": title,
                    "preview": preview,
                    "size_bytes": file.stat().st_size,
                    "modified_time": file.stat().st_mtime,
                })
            except Exception:
                continue
    return notes


def get_study_note(filename: str) -> Optional[str]:
    """
    Reads full content of a specific study note file.
    """
    safe_name = Path(filename).name
    filepath = NOTES_DIR / safe_name
    if filepath.exists() and filepath.is_file():
        return filepath.read_text(encoding="utf-8")
    return None


def delete_study_note(filename: str) -> bool:
    """
    Deletes a study note from disk.
    """
    safe_name = Path(filename).name
    filepath = NOTES_DIR / safe_name
    if filepath.exists() and filepath.is_file():
        filepath.unlink()
        return True
    return False


# Map tool names to callables
AVAILABLE_TOOLS = {
    "search_wikipedia": search_wikipedia,
    "calculate": calculate,
    "save_study_notes": save_study_notes,
}

# Tool schemas for Function Calling (compatible with both Groq & Gemini)
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_wikipedia",
            "description": "Search Wikipedia for factual concepts, history, science, literature, and biographies.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search topic or concept keywords"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Perform mathematical or scientific calculations (supports sqrt, log, pow, sin, cos, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Math expression (e.g. 'sqrt(144) * 5' or '1643 + 300')"}
                },
                "required": ["expression"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_study_notes",
            "description": "Save study notes, revision guides, summaries, or flashcards as a markdown file on disk.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "Name of the file, e.g. 'isaac_newton.md'"},
                    "content": {"type": "string", "description": "The markdown formatted study content"}
                },
                "required": ["filename", "content"]
            }
        }
    }
]
