# Unified Autonomous Agents Launcher
param (
    [string]$Agent = "all" # Options: travel, library, study, all
)

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $rootDir ".venv\Scripts\python.exe"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    🤖 Autonomous Agentic AI Ecosystem Launcher             " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Agent selection: $Agent`n"

function Start-TravelAgent {
    Write-Host "[1/3] Launching Travel Agent (Backend: 8000, Frontend: 5173)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; & '$pythonExe' -m uvicorn app.main:app --app-dir travel-agent/backend --port 8000 --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\travel-agent\frontend'; npm run dev"
}

function Start-LibraryAgent {
    Write-Host "[2/3] Launching 3D Library Agent (Backend: 8001, Frontend: 5174)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; & '$pythonExe' -m uvicorn app.main:app --app-dir lib-chatbot/backend --port 8001 --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\lib-chatbot\frontend'; npm run dev"
}

function Start-StudyAgent {
    Write-Host "[3/3] Launching Study Assistant (Backend: 8002, Frontend: 5175)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; & '$pythonExe' -m uvicorn app.main:app --app-dir study-chatbot/backend --port 8002 --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\study-chatbot\frontend'; npm run dev"
}

switch ($Agent.ToLower()) {
    "travel" {
        Start-TravelAgent
    }
    "library" {
        Start-LibraryAgent
    }
    "study" {
        Start-StudyAgent
    }
    "all" {
        Start-TravelAgent
        Start-LibraryAgent
        Start-StudyAgent
        Write-Host "`nAll 3 agents launched in separate terminal windows!" -ForegroundColor Cyan
        Write-Host "  - Travel Agent:     http://localhost:5173 (API: http://127.0.0.1:8000)"
        Write-Host "  - 3D Library Agent: http://localhost:5174 (API: http://127.0.0.1:8001)"
        Write-Host "  - Study Assistant:  http://localhost:5175 (API: http://127.0.0.1:8002)"
    }
    default {
        Write-Host "Unknown option: $Agent. Valid options: travel, library, study, all" -ForegroundColor Red
    }
}
