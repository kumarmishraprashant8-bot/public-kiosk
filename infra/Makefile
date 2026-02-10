.PHONY: demo build up down logs seed smoke clean test

# Main demo command - builds, seeds, and starts everything
demo: build seed up
	@echo "=========================================="
	@echo "CivicPulse OS Demo Starting..."
	@echo "=========================================="
	@echo "Kiosk UI:      http://localhost:3000"
	@echo "Admin Dashboard: http://localhost:3001"
	@echo "API Docs:      http://localhost:8000/docs"
	@echo ""
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Demo ready! Check the URLs above."

# Build all Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d
	@echo "Services started. Use 'make logs' to view logs."

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Seed sample data
seed:
	@echo "Seeding database with sample data..."
	docker-compose exec backend python /scripts/seed_data.py || \
	docker-compose run --rm backend python /scripts/seed_data.py

# Run smoke tests
smoke:
	@echo "Running smoke tests..."
	bash scripts/smoke_demo.sh || \
	docker-compose exec backend pytest tests/smoke_test.py -v

# Run all tests
test:
	docker-compose exec backend pytest tests/ -v
	docker-compose exec frontend-kiosk npm test -- --run
	docker-compose exec frontend-admin npm test -- --run

# Clean up containers and volumes
clean:
	docker-compose down -v
	docker system prune -f

# Restart services
restart: down up
