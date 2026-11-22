# SahayaVoice – One-click start script (Windows PowerShell)
# Usage:  .\start.ps1
# Starts backend (port 8000) + frontend (port 3000) in separate windows.

$root = $PSScriptRoot

Write-Host ""
Write-Host "╔══════════════════════════════════════╗"  -ForegroundColor Cyan
Write-Host "║   🎙  SahayaVoice  –  Starting...    ║"  -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝"  -ForegroundColor Cyan
Write-Host ""

# ── 1. Auto-create frontend/.env.local if missing ──────────────────────────
$envLocal = Join-Path $root "frontend\.env.local"
$envExample = Join-Path $root "frontend\.env.local.example"
if (-not (Test-Path $envLocal)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envLocal
        Write-Host "✅ Created frontend/.env.local from example" -ForegroundColor Green
    }
}

# ── 2. Install frontend deps if node_modules is missing ────────────────────
$nodeModules = Join-Path $root "frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "📦 Installing frontend dependencies (first run)..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "frontend")
    npm install
    Pop-Location
    Write-Host "✅ Frontend deps installed" -ForegroundColor Green
}

# ── 3. Install backend deps if not present ─────────────────────────────────
$backendCheck = python -c "import fastapi" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "backend")
    pip install -r requirements.txt
    Pop-Location
    Write-Host "✅ Backend deps installed" -ForegroundColor Green
}

# ── 4. Start backend in a new terminal window ──────────────────────────────
Write-Host ""
Write-Host "🚀 Starting Backend  → http://localhost:8000" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root\backend'; Write-Host '⚙️  SahayaVoice Backend' -ForegroundColor Cyan; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
)

# ── 5. Start frontend in a new terminal window ─────────────────────────────
Write-Host "🚀 Starting Frontend → http://localhost:3000" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root\frontend'; Write-Host '🌐  SahayaVoice Frontend' -ForegroundColor Cyan; npm run dev"
)

Write-Host ""
Write-Host "──────────────────────────────────────────"
Write-Host "  Backend  →  http://localhost:8000"
Write-Host "  Frontend →  http://localhost:3000"
Write-Host "  API Docs →  http://localhost:8000/docs"
Write-Host "──────────────────────────────────────────"
Write-Host ""
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"
