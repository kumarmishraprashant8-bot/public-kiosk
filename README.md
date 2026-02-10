# CivicPulse OS

**Autonomous Multilingual Smart Urban Helpdesk Kiosk**

## TL;DR

```bash
make demo
```

This builds Docker images, seeds sample data, and starts all services. Open:
- **Kiosk UI**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **API Docs**: http://localhost:8000/docs

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Make (or run docker-compose commands directly)

### Run Demo
```bash
make demo
```

### Manual Setup
```bash
# Build and start services
docker-compose up --build

# Seed sample data (in another terminal)
make seed

# Run smoke tests
make smoke
```

### Development

```bash
# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed system design.

## Demo Script

See [docs/demo.md](docs/demo.md) for the 4-minute demo walkthrough.

## Project Structure

```
├── frontend-kiosk/     # React + Vite kiosk UI
├── frontend-admin/     # React + Vite admin dashboard
├── backend/            # FastAPI backend
├── infra/              # Docker & deployment configs
├── docs/               # Documentation
└── scripts/            # Utility scripts
```

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL + Redis + SQLite (kiosk offline)
- **OCR**: Tesseract.js / tesseract-ocr
- **ML**: scikit-learn (TF-IDF, clustering)
- **Maps**: Leaflet.js

## License

MIT
