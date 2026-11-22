#!/bin/bash
# SahayaVoice – One-click start script (Mac / Linux)
# Usage:  bash start.sh
# Starts backend (:8000) and frontend (:3000) in background.

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   🎙  SahayaVoice  –  Starting...    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Auto-create frontend/.env.local if missing
if [ ! -f "$ROOT/frontend/.env.local" ] && [ -f "$ROOT/frontend/.env.local.example" ]; then
  cp "$ROOT/frontend/.env.local.example" "$ROOT/frontend/.env.local"
  echo "✅ Created frontend/.env.local from example"
fi

# 2. Install frontend deps if missing
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies (first run)..."
  cd "$ROOT/frontend" && npm install
  echo "✅ Frontend deps installed"
fi

# 3. Start backend
echo "🚀 Starting Backend  → http://localhost:8000"
cd "$ROOT/backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# 4. Start frontend
echo "🚀 Starting Frontend → http://localhost:3000"
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "──────────────────────────────────────────"
echo "  Backend  →  http://localhost:8000"
echo "  Frontend →  http://localhost:3000"
echo "  API Docs →  http://localhost:8000/docs"
echo "──────────────────────────────────────────"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
