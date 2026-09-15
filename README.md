# 🎓 Autonomous Agentic Study Assistant

A lightweight **Agentic AI** study companion that runs entirely inside a Jupyter Notebook ([chat.ipynb](file:///c:/Agentic%20AI/chatbot/chat.ipynb)), powered by the **Groq API** (`openai/gpt-oss-120b`).

---

## 💡 What is this Project?

Unlike standard chatbots that only answer questions from memory, this assistant is an **autonomous AI Agent**. It can:
- **Think & Plan**: Break complex study tasks into logical steps.
- **Use Real Tools**: Search the web for facts, calculate equations, and save notes to your hard drive.
- **Learn & Observe**: Inspect tool outputs before delivering the final answer.

---

## 🔄 How It Works (The ReAct Loop)

The agent follows the **ReAct (Reason $\rightarrow$ Act $\rightarrow$ Observe)** pattern:

```text
User Goal ──► LLM Reasons ──► Chooses Tool (Action) ──► Executes in Python ──► Observes Result ──► Final Answer
```

1. **User sets a goal** (e.g., *"Research Newton, calculate his age 300 years later, and save notes"*).
2. **Agent decides** if it needs external tools.
3. **Agent calls tools**, collects the data, and checks if more steps are needed.
4. **Agent finishes** and delivers a verified answer and saves any requested files.

---

## 🛠️ Built-in Tools

| Tool | What It Does | Why It Matters |
| :--- | :--- | :--- |
| 🔍 **`search_wikipedia`** | Queries live Wikipedia articles via REST API | Fetches verified, up-to-date facts instead of hallucinating. |
| 🧮 **`calculate`** | Evaluates math/physics formulas in Python | Performs 100% accurate calculations (e.g. roots, powers, dates). |
| 📝 **`save_study_notes`** | Writes `.md` files directly to `study_notes/` | Creates permanent revision notes and flashcards on your computer. |

---

## 📂 Project Structure

```text
chatbot/
├── chat.ipynb          # Main Jupyter Notebook (run the agent here)
├── .env                # Stores your GROQ_API_KEY (kept private)
├── .gitignore          # Prevents .env from being tracked by git
├── study_notes/        # Folder where the agent saves generated notes
│   └── newton_facts.md # Example generated study note
└── README.md           # Project documentation
```

---

## 🚀 Quick Setup & Usage

### 1. Configure Your API Key
In the [.env](file:///c:/Agentic%20AI/chatbot/.env) file, add your Groq API key:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```
*(The [.gitignore](file:///c:/Agentic%20AI/chatbot/.gitignore) ensures your key is never committed.)*

### 2. Run the Notebook
1. Open [chat.ipynb](file:///c:/Agentic%20AI/chatbot/chat.ipynb).
2. Select your Python kernel (`.venv`).
3. Run the cells in order:
   - **Step 1 & 2**: Initializes Groq client and registers tools.
   - **Step 3**: Runs an automated test demonstrating tool calling.
   - **Step 4**: Opens an interactive session where you can enter any study prompt.

---

## ⚡ Live Example

**Input Goal:**
> *"Research Isaac Newton on Wikipedia, calculate what year it was 300 years after his birth (1643), and save a 3-bullet revision note to newton_facts.md"*

**Agent Execution:**
1. 🛠️ **Action**: Calls `search_wikipedia({'query': 'Isaac Newton'})` $\rightarrow$ Fetches biographical facts.
2. 🛠️ **Action**: Calls `calculate({'expression': '1643 + 300'})` $\rightarrow$ Evaluates to `1943`.
3. 🛠️ **Action**: Calls `save_study_notes(...)` $\rightarrow$ Saves `newton_facts.md` inside `study_notes/`.
4. 🎓 **Final Answer**: Provides complete, verified summary to the user.
