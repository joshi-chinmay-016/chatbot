# 🤖 Autonomous Agentic AI Ecosystem

A modular suite of **Autonomous AI Agents** demonstrating modern agentic architectures, multi-step planning, deterministic tool execution, constraint evaluation, autonomous re-planning, and human-in-the-loop safety controls.

---

## 🌟 Projects Overview

| Project | Folder | Ports (Backend / Frontend) | LLM & Tools | Key Agentic Features |
| :--- | :--- | :--- | :--- | :--- |
| **Autonomous Travel Agent** | [`travel-agent/`](file:///c:/Agentic%20AI/chatbot/travel-agent) | Backend: `8000`<br/>Frontend: `5173` | Gemini 2.5 Flash<br/>- `search_transport`<br/>- `search_hotels`<br/>- `calculate_budget`<br/>- `create_itinerary` | Multi-step trip planning, budget arithmetic constraint checking, **autonomous re-planning** upon budget violation, human authorization prompt. |
| **CMRIT 3D Library Agent** | [`lib-chatbot/`](file:///c:/Agentic%20AI/chatbot/lib-chatbot) | Backend: `8001`<br/>Frontend: `5174` | Gemini 2.5 Flash<br/>- `list_books`<br/>- `prepare_borrow`<br/>- `recommend_books` | **Interactive 3D Virtual Library** (Three.js), book borrow/return lifecycle, autonomous substitute re-planning when books are checked out. |
| **Autonomous Study Assistant** | [`study-chatbot/`](file:///c:/Agentic%20AI/chatbot/study-chatbot) | Backend: `8002`<br/>Frontend: `5175` | Groq / Gemini<br/>- `search_wikipedia`<br/>- `calculate`<br/>- `save_study_notes` | Autonomous study planner, live Wikipedia knowledge retrieval, formula calculator, and markdown revision note compiler to disk. |

---

## 🚀 Quick Start: Launch Any or All Agents

You can launch any agent individually or launch all three concurrently using the unified launcher:

### 1. Launch All Agents Concurrently
```powershell
.\start_all.ps1 -Agent all
```
*Or simply run `start_all.bat`.*

### 2. Launch Individual Agents
```powershell
# Launch only the Travel Agent (Ports 8000 & 5173)
.\start_all.ps1 -Agent travel

# Launch only the 3D Library Agent (Ports 8001 & 5174)
.\start_all.ps1 -Agent library

# Launch only the Study Assistant (Ports 8002 & 5175)
.\start_all.ps1 -Agent study
```

---

## 📋 Running Services Manually

### Travel Agent
```bash
# Backend (Port 8000)
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir travel-agent/backend --port 8000 --reload

# Frontend (Port 5173)
cd travel-agent/frontend
npm run dev
```
- Web UI: [http://localhost:5173](http://localhost:5173)
- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Verification test: `.\.venv\Scripts\python.exe travel-agent/backend/test_agent.py`

### 3D Library Agent
```bash
# Backend (Port 8001)
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir lib-chatbot/backend --port 8001 --reload

# Frontend (Port 5174)
cd lib-chatbot/frontend
npm run dev
```
- Web UI: [http://localhost:5174](http://localhost:5174)
- API Docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- Verification test: `.\.venv\Scripts\python.exe lib-chatbot/backend/test_agent.py`

### Study Assistant
```bash
# Backend (Port 8002)
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir study-chatbot/backend --port 8002 --reload

# Frontend (Port 5175)
cd study-chatbot/frontend
npm run dev
```
- Web UI: [http://localhost:5175](http://localhost:5175)
- API Docs: [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs)
- Verification test: `.\.venv\Scripts\python.exe study-chatbot/backend/test_agent.py`

---

## 🔒 Security & Environment Setup

All API keys are maintained in the root `.env` file and excluded from version control via `.gitignore`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```
