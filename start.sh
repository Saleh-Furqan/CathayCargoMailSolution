#!/bin/bash
# 🚀 Cathay Cargo Mail Solution - Unified Startup Script
# Starts both backend and frontend servers concurrently

set -e  # Exit on error

echo "🚀 Starting Cathay Cargo Mail Solution..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the CathayCargoMailSolution root directory"
    exit 1
fi

# Cleanup function for graceful shutdown
cleanup() {
    print_warning "\n🛑 Shutting down servers..."
    jobs -p | xargs -r kill
    print_success "✅ All servers stopped"
    exit 0
}

# Set up signal handling for graceful shutdown
trap cleanup SIGINT SIGTERM

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Backend setup and start
setup_backend() {
    print_status "🔧 Setting up backend..."
    
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Virtual environment not found. Creating..."
        python3 -m venv venv
        print_success "Virtual environment created"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check if dependencies are installed
    if ! python3 -c "import flask" 2>/dev/null; then
        print_warning "Installing backend dependencies..."
        pip install -r requirements.txt
        print_success "Backend dependencies installed"
    fi
    
    # Check backend port
    if check_port 5001; then
        print_warning "Port 5001 is already in use. Attempting to kill existing process..."
        lsof -ti:5001 | xargs -r kill -9
        sleep 2
    fi
    
    print_success "Backend setup complete"
    cd ..
}

# Frontend setup and start
setup_frontend() {
    print_status "🔧 Setting up frontend..."
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Node modules not found. Installing..."
        npm install
        print_success "Frontend dependencies installed"
    fi
    
    # Check frontend ports
    for port in 5173 3000 3001; do
        if check_port $port; then
            print_warning "Port $port is already in use. Will try next available port."
        fi
    done
    
    print_success "Frontend setup complete"
    cd ..
}

# Start backend server
start_backend() {
    print_status "🚀 Starting backend server..."
    
    cd backend
    source venv/bin/activate
    
    # Start backend in background
    {
        echo -e "${BLUE}[BACKEND]${NC} Starting Flask server..."
        python3 src/app.py 2>&1 | while IFS= read -r line; do
            echo -e "${BLUE}[BACKEND]${NC} $line"
        done
    } &
    
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    print_status "Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5001/health >/dev/null 2>&1; then
            print_success "✅ Backend server is running at http://localhost:5001"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "❌ Backend failed to start after 30 seconds"
            exit 1
        fi
        sleep 1
    done
}

# Start frontend server  
start_frontend() {
    print_status "🚀 Starting frontend server..."
    
    cd frontend
    
    # Start frontend in background
    {
        echo -e "${GREEN}[FRONTEND]${NC} Starting Vite dev server..."
        npm run dev 2>&1 | while IFS= read -r line; do
            echo -e "${GREEN}[FRONTEND]${NC} $line"
        done
    } &
    
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    print_status "Waiting for frontend to start..."
    sleep 5
    print_success "✅ Frontend server starting..."
}

# Main execution
main() {
    print_status "🔍 Performing setup checks..."
    
    setup_backend
    setup_frontend
    
    print_status "🚀 Starting servers..."
    
    start_backend
    start_frontend
    
    echo ""
    echo "================================================"
    print_success "🎉 Cathay Cargo Mail Solution is running!"
    echo "================================================"
    echo ""
    echo "📍 Access Points:"
    echo "   • Frontend:  http://localhost:5173 (or check terminal for actual port)"
    echo "   • Backend:   http://localhost:5001"
    echo "   • API Docs:  http://localhost:5001/health"
    echo ""
    echo "💡 Tips:"
    echo "   • Press Ctrl+C to stop both servers"
    echo "   • Check the terminal output above for any errors"
    echo "   • Frontend will auto-reload on file changes"
    echo "   • Backend runs in debug mode with auto-reload"
    echo ""
    print_warning "📝 Both servers are running. Press Ctrl+C to stop..."
    
    # Wait for user to stop
    wait
}

# Run main function
main