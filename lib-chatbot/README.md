# CMRIT Autonomous 3D Library Agent (`lib-chatbot`)

A state-of-the-art **Autonomous Library Agent with an Interactive 3D Virtual Library Frontend** built to demonstrate the full Agentic AI lifecycle: **Goal Understanding, Planning, Reasoning, Tool Selection, Tool Execution, Observation, Evaluation (Constraint Checking), Autonomous Re-Planning, and Human-in-the-Loop Authorization**.

---

## 1. Project Overview

The CMRIT Autonomous Library Agent manages technical library archives through natural conversation and visual 3D interaction. When students ask to borrow or inspect books, the agent:
1. Understands student intent (e.g. *"Can I borrow Clean Code?"*).
2. Verifies catalog inventory and constraint rules (e.g. book availability).
3. If an item is borrowed (**Constraint Violation / Failure Scenario**), the agent **autonomously re-plans** by searching for and proposing available substitutes in the same technical domain.
4. Enforces the **Human-in-the-Loop Safety Rule**: no inventory alteration occurs until explicit authorization is granted by the student/librarian.
5. Reflects all actions live in a **3D Virtual Bookshelf** rendered with Three.js.

---

## 2. Architecture

```mermaid
flowchart TD
    subgraph Frontend ["React 3D Frontend (Vite + Three.js) - Port 5174"]
        Scene3D["3D Virtual Library Canvas (Three.js)<br/>- 3D Wooden & Metallic Shelves<br/>- Textured Book Meshes (Canvas Front & Spines)<br/>- Real-time Neon Halos (Green: In Stock / Red: Borrowed)<br/>- Raycaster Click & Hover 3D Inspector"]
        Console["AI Agent Console<br/>- Scenario Pills & Natural Language Chat<br/>- Real-Time Execution Trace Timeline<br/>- Human Approval Card<br/>- 3D Catalog Filter Grid"]
    end

    subgraph Backend ["FastAPI Backend (lib-chatbot/backend) - Port 8001"]
        API["REST Endpoints: /api/library/*<br/>- /health, /books, /stats, /chat, /approve, /reset"]
        Agent["LibraryAgent Orchestrator<br/>- Goal Understanding (Gemini 2.5 Flash)<br/>- Multi-Step Plan Formulator<br/>- Constraint Evaluator & Re-Planner"]
        Mem["Memory & Persistence Store<br/>- books.json synchronizer<br/>- Transaction log & student loans<br/>- Catalog reset facility"]
        Tools["Deterministic Library Tools<br/>- list_all_books<br/>- search_books<br/>- prepare_borrow<br/>- prepare_return<br/>- recommend_books<br/>- get_library_stats"]
    end

    subgraph LLM ["Google Gemini API"]
        Gemini["Gemini 2.5 Flash<br/>- Intent extraction & entity parsing<br/>- Technical domain recommendations"]
    end

    Console -->|POST /api/library/chat| API
    Console -->|POST /api/library/approve| API
    API --> Agent
    Agent <-->|Reasoning & Extraction| Gemini
    Agent <--> Mem
    Agent --> Tools
    Tools <--> Mem
    API -->|Execution Trace & State| Console
    API -->|Live Catalog| Scene3D
```

---

## 3. Autonomous Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant 3DUI as 3D React Frontend
    participant API as FastAPI Backend
    participant Agent as LibraryAgent
    participant LLM as Gemini 2.5 Flash
    participant Tools as Library Tools
    participant Store as Memory (books.json)

    Student->>3DUI: "Can I borrow Clean Code?"
    3DUI->>API: POST /api/library/chat
    API->>Agent: Execute autonomous cycle
    Agent->>LLM: Goal Understanding (Parse intent and target book)
    LLM-->>Agent: Action: BORROW, Title: "Clean Code", Domain: "Software Engineering"
    Agent->>Agent: Formulate initial plan
    Agent->>Tools: get_book_details("Clean Code")
    Tools->>Store: Query status
    Store-->>Tools: {"title": "Clean Code", "available": false}
    Tools-->>Agent: Book details (available: False)

    rect rgb(255, 235, 235)
        Note over Agent: EVALUATION: FAIL<br/>Constraint Violation: Book is currently borrowed
        Agent->>Agent: Autonomous Re-Planning Triggered!
        Agent->>Tools: recommend_books("Software Engineering", only_available=True)
        Tools-->>Agent: Found "Python Crash Course"
        Agent->>Agent: Formulate Alternative Offer & Substitute Plan
    end

    Agent->>Tools: prepare_borrow(student_id, "Python Crash Course")
    Tools->>Store: Save pending transaction (status: "awaiting_approval")
    Tools-->>Agent: Pending tx-123 ready
    Agent-->>API: Return Execution Trace, Alternative Book, Approval Required = True
    API-->>3DUI: Display Trace, highlight 3D substitute, show Approval Card
    Student->>3DUI: Clicks [ Authorize Action ]
    3DUI->>API: POST /api/library/approve {"action": "approve", "transaction_id": "tx-123"}
    API->>Store: Commit loan to books.json
    API-->>3DUI: Confirmation receipt & updated catalog
    3DUI->>3DUI: Confetti celebration & 3D book halo updates from Green to Red!
```

---

## 4. 3D Virtual Library Features

- **Procedural 3D Books**: Each book from `books.json` is generated with realistic dimensions, rounded spine, embossed vertical titles, and category-themed palette textures.
- **Real-Time Availability Auras**:
  - Available books project a pulsing **emerald green halo** and glowing top beacon pin.
  - Checked-out books emit a **crimson status halo**.
- **Interactive Raycasting**:
  - Hovering a book smoothly slides it forward from the shelf, illuminates it with rim-light, and displays a floating 3D HUD card.
  - Clicking a book smoothly glides the camera and opens the **3D Book Inspector**.
- **Orbit Controls & View Presets**:
  - Full 360° mouse drag orbit, zoom, and preset angle buttons ("Shelf View", "Studio Angle", "Tactical Top").

---

## 5. Library Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `list_all_books` | None | Returns the full catalog with availability |
| `search_books` | `query` | Searches by title, author, or category keyword |
| `get_book_details` | `title` | Retrieves detailed metadata and shelf bay position |
| `prepare_borrow` | `student_id`, `title` | Verifies availability, checks loan quota (max 3), creates pending checkout record |
| `prepare_return` | `student_id`, `title` | Verifies book is borrowed, creates pending return record |
| `recommend_books`| `category_or_topic` | Recommends books based on topic or related technical category |
| `get_library_stats`| None | Returns total books, available count, borrowed count, and category distributions |

---

## 6. How to Run

### Backend (FastAPI on Port 8001)

From repository root (`chatbot/`):

```bash
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir lib-chatbot/backend --port 8001 --reload
```

Interactive Swagger Docs available at: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

Run automated backend tests:
```bash
.\.venv\Scripts\python.exe lib-chatbot/backend/test_agent.py
```

### Frontend (React + Vite + Three.js on Port 5174)

```bash
Push-Location lib-chatbot/frontend
npm run dev
Pop-Location
```

The 3D Virtual Library will be live at: [http://localhost:5174/](http://localhost:5174/)
