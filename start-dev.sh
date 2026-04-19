#!/bin/bash

# Configuration
PROJECT_ROOT=$(pwd)

echo "🚀 Starting Chegg Scheduling App (Dev Mode)..."

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT SIGTERM

# 1. Start Notification Service
echo "📡 Starting Notification Service..."
cd $PROJECT_ROOT/notification-service && npm run start:dev &

# 2. Start Backend
echo "⚙️ Starting Backend..."
cd $PROJECT_ROOT/backend && npm run dev &

# 3. Start Frontend
echo "💻 Starting Frontend..."
cd $PROJECT_ROOT/frontend && npm run dev &

# Wait for all background jobs
echo "✅ All services are launching. Close this terminal to stop everything."
wait
