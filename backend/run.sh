#!/bin/bash
# Cathay Cargo Mail Solution - Backend Server Startup Script

# Navigate to the backend directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run: python3 -m venv venv && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "❌ Dependencies not found. Installing..."
    pip install -r requirements.txt
fi

# Start the Flask application
echo "🚀 Starting Cathay Cargo Mail Solution Backend..."
echo "📍 Server will be available at: http://localhost:5001"
echo "🔧 Debug mode: ON (for development)"
echo ""

python3 src/app.py