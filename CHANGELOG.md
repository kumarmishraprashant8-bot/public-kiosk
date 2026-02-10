# Changelog

## [Unreleased]

### Milestone A - Project Skeleton
- feat: initial project structure with frontend-kiosk, frontend-admin, backend, infra, docs, scripts
- feat: docker-compose.yml with postgres, redis, backend, frontend-kiosk, frontend-admin services
- feat: Makefile with demo, build, up, down, seed, smoke, test targets
- feat: README.md with TL;DR and quick start guide
- feat: CI workflow placeholder (GitHub Actions)
- feat: basic React + Vite + TypeScript setup for both frontends
- feat: FastAPI backend skeleton with health check endpoint
- feat: Dockerfiles for all services with Tesseract OCR support

### Milestone B - Core Backend & API
- feat: SQLAlchemy models (User, Submission, Receipt, Cluster, KioskLog, OTP)
- feat: FastAPI routers for auth, submissions, receipts, OCR, admin
- feat: OTP request/verify endpoints with JWT token generation (OTP logged to console)
- feat: Submission creation with hash chain receipt generation
- feat: Receipt verification endpoint with chain integrity check
- feat: OCR parsing endpoint using Tesseract with regex heuristics for Indian bill formats
- feat: Admin endpoints for clusters, heatmap data, simulate updates, trigger clustering
- feat: Intent classifier (keyword + TF-IDF fallback)
- feat: Clustering service (TF-IDF + DBSCAN) with escalation detection
- feat: Alembic migration setup
- feat: Basic pytest test structure

### Milestone C - Kiosk Frontend
- feat: React Router setup with HomePage, PhoneAuthPage, SubmitPage, ReceiptPage
- feat: Language selector component (English, Hindi, Tamil) with translations
- feat: AvatarHelp component with TTS (SpeechSynthesis API) for low-literacy support
- feat: PhotoUpload component with image preview
- feat: OCRFormFields component for editable pre-filled form data
- feat: ReceiptDisplay component with QR code (qrcode.react) and print CSS for thermal printers
- feat: Offline queue using IndexedDB for local storage when backend unreachable
- feat: Automatic sync worker (15s interval) to sync queued submissions when online
- feat: Touch-optimized UI with large buttons (min 48px), clear contrast, accessible design
- feat: Online/offline status indicator
- feat: JWT token storage and API interceptors for authenticated requests

### Milestone D - OCR & Auto-fill
- feat: Backend OCR endpoint POST /ocr/parse using Tesseract with multi-language support (eng+hin+tam)
- feat: Regex heuristics for Indian bill formats (account number, amount, date, biller, name, address)
- feat: Frontend photo upload integration with OCR parsing
- feat: Editable form fields pre-filled from OCR results with confidence scores

### Milestone E - Admin Dashboard + Clustering
- feat: Admin login page with simple password authentication (demo: admin123)
- feat: Dashboard with cluster heatmap using Leaflet.js and react-leaflet
- feat: Cluster visualization with circles scaled by size, color-coded by priority
- feat: Escalation alerts displayed prominently when clusters exceed threshold
- feat: Submissions table with selectable rows for batch operations
- feat: One-click "Simulate Dispatch" button to update submission statuses
- feat: Manual clustering trigger button
- feat: Auto-refresh every 30 seconds

### Milestone F - Hash Chain Receipts & Verification
- feat: Receipt hash computation using SHA256(prev_hash + submission_json)
- feat: Hash chain storage in database with prev_hash linking
- feat: GET /receipt/{id}/verify endpoint with chain integrity verification
- feat: Chain position calculation for receipt ordering
- feat: QR code generation with receipt_id and short hash (first 8 chars)

### Milestone G - Demo & Docs
- feat: Comprehensive demo script (docs/demo.md) with 4-minute walkthrough
- feat: Architecture documentation (docs/architecture.md) with ASCII diagram
- feat: Seed data script (scripts/seed_data.py) generating 200 complaints + 50 OCR samples
- feat: Sample OCR data JSON file for testing
- feat: Demo timing breakdown and troubleshooting guide
- feat: Security and compliance notes

### Milestone H - Tests and Reliability
- feat: pytest unit tests for auth, receipts, clustering
- feat: Smoke test script (scripts/smoke_demo.sh) for basic API validation
- feat: Test coverage for hash computation, receipt ID generation
- feat: Integration test structure for E2E flows
