#!/bin/bash

# Beniteca - Stop Development Servers

echo "🛑 Stopping Beniteca development servers..."

# Stop processes on port 3000 (backend)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Stopping backend (port 3000)..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
else
    echo "   Backend not running"
fi

# Stop processes on port 5173 (frontend)
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Stopping frontend (port 5173)..."
    kill $(lsof -t -i:5173) 2>/dev/null || true
else
    echo "   Frontend not running"
fi

sleep 2

echo "✅ Servers stopped"
