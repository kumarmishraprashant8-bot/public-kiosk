# CivicPulse - Makefile for demo and development
# Run "make demo" for a complete hackathon demo setup

.PHONY: help install dev demo seed test smoke clean

# Default target
help:
	@echo "CivicPulse - Available commands:"
	@echo "  make install   - Install all dependencies"
	@echo "  make dev       - Start development servers"
	@echo "  make demo      - Start demo mode (docker-compose + seed)"
	@echo "  make seed      - Seed demo data via API"
	@echo "  make test      - Run pytest tests"
	@echo "  make smoke     - Run E2E smoke tests"
	@echo "  make clean     - Clean up containers and temp files"

# Install dependencies
install:
	cd backend && pip install -r requirements.txt
	cd frontend-kiosk && npm install
	cd frontend-admin && npm install

# Start development servers (without Docker)
dev:
	@echo "Starting backend..."
	cd backend && uvicorn app.main:app --reload --port 8000 &
	@echo "Starting frontend-kiosk..."
	cd frontend-kiosk && npm run dev &
	@echo "Starting frontend-admin..."
	cd frontend-admin && npm run dev -- --port 3001 &
	@echo "All services started!"
	@echo "  Backend:  http://localhost:8000"
	@echo "  Kiosk:    http://localhost:5173"
	@echo "  Admin:    http://localhost:3001"

# Start demo mode with Docker
demo:
	@echo "🚀 Starting CivicPulse Demo..."
	@echo "Setting DEMO_MODE=true"
	cd infra && docker-compose up -d --build
	@echo "Waiting for services to start..."
	@sleep 10
	@echo "Seeding demo data..."
	curl -X POST "http://localhost:8000/admin/seed-demo?password=admin123" || true
	@echo ""
	@echo "✅ Demo ready!"
	@echo "   Kiosk:  http://localhost:3000"
	@echo "   Admin:  http://localhost:3001 (password: admin123)"
	@echo "   API:    http://localhost:8000/docs"

# Seed demo data
seed:
	@echo "🌱 Seeding demo data..."
	curl -X POST "http://localhost:8000/admin/seed-demo?password=admin123"

# Run pytest tests
test:
	cd backend && pytest tests/ -v

# Run E2E smoke tests
smoke:
	@echo "🔍 Running smoke tests..."
	chmod +x scripts/smoke_demo.sh
	./scripts/smoke_demo.sh

# Clean up
clean:
	@echo "🧹 Cleaning up..."
	cd infra && docker-compose down -v
	rm -f backend/*.db
	@echo "✅ Cleanup complete"

# Quick backend-only start (for local dev)
backend:
	cd backend && DEMO_MODE=true uvicorn app.main:app --reload --port 8000

# Quick frontend-kiosk start
kiosk:
	cd frontend-kiosk && VITE_DEMO_MODE=true npm run dev

# Quick frontend-admin start
admin:
	cd frontend-admin && VITE_DEMO_MODE=true npm run dev -- --port 3001
