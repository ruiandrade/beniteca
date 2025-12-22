#!/bin/bash

# Beniteca - Local Development Startup Script
# This script checks prerequisites and starts both backend and frontend servers

set -e

echo "🏗️  Beniteca - Starting Local Development Environment"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version is $NODE_VERSION. Version 18+ is recommended."
fi

# Check if .env file exists
if [ ! -f .env ] && [ ! -f .env.development ]; then
    echo "⚠️  No .env file found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env file. Please edit it with your Azure credentials."
        echo ""
        echo "Required variables:"
        echo "  - DATABASE_URL"
        echo "  - AZURE_STORAGE_CONNECTION_STRING"
        echo "  - AZURE_STORAGE_ACCOUNT_NAME"
        echo "  - AZURE_STORAGE_ACCESS_KEY"
        echo ""
        read -p "Press Enter after you've configured .env, or Ctrl+C to exit..."
    else
        echo "❌ env.example not found. Cannot create .env file."
        exit 1
    fi
fi

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    echo "✅ Backend dependencies installed"
    echo ""
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
    echo ""
fi

# Check if ports are available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use. Stopping existing process..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 5173 is already in use. Stopping existing process..."
    kill $(lsof -t -i:5173) 2>/dev/null || true
    sleep 2
fi

# Create logs directory
mkdir -p logs

echo "🚀 Starting services..."
echo ""

# Start backend in background
echo "▶️  Starting backend (port 3000)..."
npm start > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend failed to start. Check logs/backend.log"
    exit 1
fi

# Start frontend in background
echo "▶️  Starting frontend (port 5173)..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo "❌ Frontend failed to start. Check logs/frontend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Beniteca is running!"
echo "=================================================="
echo ""
echo "🌐 Frontend:  http://localhost:5173"
echo "🔌 Backend:   http://localhost:3000"
echo ""
echo "📋 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📁 Logs:"
echo "   Backend:  logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "To stop the servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Or use: ./stop-dev.sh"
echo ""
echo "Press Ctrl+C to stop monitoring (servers will keep running)"
echo "=================================================="

# Follow logs
echo ""
echo "📜 Tailing logs (Ctrl+C to stop monitoring)..."
echo ""
tail -f logs/backend.log logs/frontend.log
