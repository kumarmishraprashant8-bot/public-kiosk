# Commit Messages

## Milestone A - Project Skeleton
```
feat: add project skeleton with docker-compose and basic structure

- Add frontend-kiosk and frontend-admin React + Vite setups
- Add FastAPI backend skeleton
- Add docker-compose.yml with postgres, redis, backend, frontends
- Add Makefile with demo, build, seed, smoke targets
- Add CI workflow placeholder
- Add README with TL;DR and quick start
```

## Milestone B - Core Backend & API
```
feat: implement core backend API with FastAPI

- Add SQLAlchemy models (User, Submission, Receipt, Cluster, OTP, KioskLog)
- Add auth router with OTP request/verify and JWT tokens
- Add submission router with hash chain receipt generation
- Add receipt router with verification endpoint
- Add OCR router with Tesseract integration
- Add admin router with clusters, heatmap, dispatch simulation
- Add intent classifier (keyword + TF-IDF)
- Add clustering service (DBSCAN)
- Add Alembic migration setup
```

## Milestone C - Kiosk Frontend
```
feat: implement kiosk frontend with touch-optimized UI

- Add React Router with HomePage, PhoneAuthPage, SubmitPage, ReceiptPage
- Add language selector (English, Hindi, Tamil) with translations
- Add AvatarHelp component with TTS for low-literacy support
- Add PhotoUpload component with image preview
- Add OCRFormFields for editable pre-filled data
- Add ReceiptDisplay with QR code and print CSS
- Add offline queue using IndexedDB
- Add automatic sync worker (15s interval)
- Add touch-optimized UI (min 48px targets)
```

## Milestone D - OCR & Auto-fill
```
feat: add OCR parsing with Tesseract and regex heuristics

- Add POST /ocr/parse endpoint with Tesseract multi-language support
- Add regex heuristics for Indian bill formats
- Add frontend OCR integration with photo upload
- Add editable form fields with confidence scores
```

## Milestone E - Admin Dashboard
```
feat: implement admin dashboard with clustering visualization

- Add admin login page with password authentication
- Add cluster heatmap using Leaflet.js
- Add submissions table with batch selection
- Add escalation alerts for threshold breaches
- Add simulate dispatch functionality
- Add manual clustering trigger
- Add auto-refresh every 30 seconds
```

## Milestone F - Hash Chain Receipts
```
feat: implement hash chain receipts for tamper-proof verification

- Add receipt hash computation: SHA256(prev_hash + submission_json)
- Add hash chain storage with prev_hash linking
- Add GET /receipt/{id}/verify endpoint
- Add chain position calculation
- Add QR code generation with receipt_id and short hash
```

## Milestone G - Demo & Docs
```
feat: add comprehensive demo script and architecture documentation

- Add 4-minute demo walkthrough (docs/demo.md)
- Add architecture documentation with ASCII diagram (docs/architecture.md)
- Add seed data script generating 200 complaints + 50 OCR samples
- Add sample OCR data JSON for testing
- Add troubleshooting guide and timing breakdown
```

## Milestone H - Tests
```
feat: add test suite and smoke tests

- Add pytest unit tests for auth, receipts, clustering
- Add smoke test script for API validation
- Add test coverage for hash computation
- Add integration test structure
```
