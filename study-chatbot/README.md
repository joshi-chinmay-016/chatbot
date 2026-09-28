# Autonomous Agentic Study Assistant (`study-chatbot`)

A high-performance **Autonomous Agentic Study Assistant** built with a **FastAPI backend** and a modern **React (Vite) frontend**. Unlike conventional passive chatbots that only generate conversational text, this agent can autonomously plan, retrieve live factual knowledge from Wikipedia, solve complex scientific formulas without hallucinating, and compile persistent markdown revision guides directly to disk.

---

## 1. Project Overview

The Autonomous Study Assistant operates as a dedicated pair-learning agent. When given a complex study goal (e.g. *"Research Isaac Newton on Wikipedia, calculate what year it was 300 years after his birth (1643), and save a 3-bullet revision note to newton_facts.md"*), the agent:
1. **Understands & Plans**: Formulates the required sequence of research, computation, and file persistence.
2. **Executes External Tools**:
   - 🔍 **`search_wikipedia`**: Fetches encyclopedic summaries from Wikipedia's live REST API.
   - 🧮 **`calculate`**: Evaluates mathematical and scientific formulas with absolute precision (supporting trigonometry, logarithms, powers, and roots).
   - 📝 **`save_study_notes`**: Compiles structured markdown revision guides into `study_notes/`.
3. **Presents Live Trace**: Logs every reasoning step, tool call, and observation on an interactive visual timeline.

---

## 2. Architecture

```mermaid
flowchart TD
    subgraph Frontend ["React Frontend (Vite) - Port 5175"]
        UI["Study Assistant Workspace<br/>- Dual Panel Layout<br/>- Notes Manager & Markdown Viewer<br/>- Agent Chat with Quick Scenario Chips<br/>- Real-Time Execution Trace Timeline<br/>- Live Math / Formula Scratchpad"]
    end

    subgraph Backend ["FastAPI Backend (study-chatbot/backend) - Port 8002"]
        API["REST Endpoints: /api/study/*<br/>- /health, /chat, /notes, /notes/{filename}, /calculate, /search"]
        Agent["StudyAgent Orchestrator<br/>- ReAct Reasoning Loop<br/>- Multi-Step Plan Formulator<br/>- Dual LLM Engine (Groq + Gemini fallback)"]
        Store["File Persistence Layer<br/>- study_notes/*.md reader & writer<br/>- Note metadata indexer"]
        Tools["Autonomous Study Tools<br/>- search_wikipedia (Live Wikipedia API)<br/>- calculate (Scientific math engine)<br/>- save_study_notes (Markdown writer)"]
    end

    subgraph External ["External Services"]
        Wiki["Wikipedia REST API<br/>(Live factual encyclopedic data)"]
        LLM["Groq (openai/gpt-oss-120b)<br/>& Google Gemini 2.5 Flash"]
    end

    UI -->|POST /api/study/chat| API
    UI -->|GET /api/study/notes| API
    API --> Agent
    Agent <-->|Reasoning & Function Calling| LLM
    Agent --> Tools
    Tools -->|HTTP GET| Wiki
    Tools -->|File I/O| Store
    API -->|Step Trace & Output| UI
```

---

## 3. Agent Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Frontend as React Frontend
    participant API as FastAPI Backend
    participant Agent as StudyAgent
    participant Wiki as Wikipedia API
    participant Calc as Math Engine
    participant Disk as study_notes/*.md

    Student->>Frontend: "Research Isaac Newton, calculate the year 300 years after his birth (1643), and save notes"
    Frontend->>API: POST /api/study/chat
    API->>Agent: Run autonomous cycle
    Agent->>Agent: Phase 1: GOAL_UNDERSTANDING & PLANNING

    rect rgb(235, 245, 255)
        Note over Agent: Iteration 1: Research
        Agent->>Wiki: search_wikipedia("Isaac Newton")
        Wiki-->>Agent: Born 1643, Principia Mathematica, Laws of Motion...
        Agent->>Agent: Log Step 1 (Observation recorded)
    end

    rect rgb(255, 245, 235)
        Note over Agent: Iteration 2: Calculation
        Agent->>Calc: calculate("1643 + 300")
        Calc-->>Agent: 1943
        Agent->>Agent: Log Step 2 (Observation recorded)
    end

    rect rgb(235, 255, 235)
        Note over Agent: Iteration 3: Note Compilation
        Agent->>Disk: save_study_notes("newton_facts.md", content)
        Disk-->>Agent: Saved successfully
        Agent->>Agent: Log Step 3 (File written to disk)
    end

    Agent-->>API: Return final synthesis + Step-by-step Execution Trace
    API-->>Frontend: Display final answer, execution steps, and refresh notes list
    Frontend->>Frontend: Notes sidebar automatically highlights newton_facts.md!
```

---

## 4. Registered Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `search_wikipedia` | `query: str` | Queries live Wikipedia REST API for verified factual knowledge |
| `calculate` | `expression: str` | Evaluates math and physics formulas without model drift or hallucination |
| `save_study_notes` | `filename: str, content: str` | Compiles and writes formatted markdown revision guides directly to `study_notes/` |
| `list_study_notes` | None | Returns index of all saved notes with title, preview, and size |
| `get_study_note` | `filename: str` | Reads full content of a note from disk |

---

## 5. How to Run

### Backend (FastAPI on Port 8002)

From the repository root (`chatbot/`):

```bash
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir study-chatbot/backend --port 8002 --reload
```

Interactive Swagger Docs available at: [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs)

Run automated backend tests:
```bash
.\.venv\Scripts\python.exe study-chatbot/backend/test_agent.py
```

### Frontend (React + Vite on Port 5175)

```bash
Push-Location study-chatbot/frontend
npm run dev
Pop-Location
```

The Study Assistant will be live at: [http://localhost:5175/](http://localhost:5175/)
