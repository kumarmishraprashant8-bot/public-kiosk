# CivicPulse Architecture

## System Overview

CivicPulse OS is an autonomous multilingual smart urban helpdesk kiosk system designed for low-literacy users in Indian cities. The system enables citizens to submit complaints via touchscreen kiosks with photo upload, OCR auto-fill, and offline-first operation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Kiosk Frontend                        │
│  (React + Vite + TypeScript)                                │
│  - Touch-optimized UI                                        │
│  - Multilingual (EN/HI/TA)                                   │
│  - TTS Avatar Help                                           │
│  - Photo Upload                                              │
│  - Offline Queue (IndexedDB)                                │
│  - Receipt Display with QR                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST
                        │ JWT Auth
┌───────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend                           │
│  (Python 3.11)                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Auth Router  │  │ Submission  │  │ OCR Router   │        │
│  │ - OTP        │  │ Router      │  │ - Tesseract  │        │
│  │ - JWT        │  │ - Create    │  │ - Parse      │        │
│  └──────────────┘  │ - Receipt   │  └──────────────┘        │
│                    │ - Hash Chain│                           │
│  ┌──────────────┐  └──────────────┘  ┌──────────────┐        │
│  │ Admin Router│                      │ Clustering  │        │
│  │ - Clusters  │                      │ - TF-IDF    │        │
│  │ - Heatmap   │                      │ - DBSCAN    │        │
│  │ - Dispatch  │                      │ - Escalate  │        │
│  └──────────────┘                      └──────────────┘        │
└───────────┬───────────────────────────────────┬───────────────┘
            │                                   │
    ┌───────▼────────┐                 ┌───────▼────────┐
    │  PostgreSQL    │                 │     Redis      │
    │  - Users       │                 │  - Queue       │
    │  - Submissions │                 │  - Cache       │
    │  - Receipts    │                 └────────────────┘
    │  - Clusters    │
    │  - OTPs        │
    └────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                           │
│  (React + Vite + TypeScript)                                │
│  - Cluster Heatmap (Leaflet)                                 │
│  - Submissions Table                                         │
│  - Escalation Alerts                                         │
│  - Dispatch Simulation                                       │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend Kiosk

**Technology**: React 18 + Vite + TypeScript + Tailwind CSS

**Key Features**:
- **Offline Queue**: Uses IndexedDB to store submissions locally when backend is unreachable
- **Sync Worker**: Automatically attempts to sync queued submissions every 15 seconds
- **TTS Integration**: Browser SpeechSynthesis API for low-literacy support
- **Multilingual**: i18n support for English, Hindi, Tamil
- **Touch Optimization**: Minimum 48px touch targets, high contrast

**Routes**:
- `/` - Home/Language selection
- `/phone` - Phone authentication (OTP)
- `/submit` - Complaint submission with OCR
- `/receipt/:id` - Receipt display with QR

### Backend API

**Technology**: FastAPI (Python 3.11) + SQLAlchemy + Alembic

**Key Modules**:
- **Auth**: OTP generation/verification, JWT tokens
- **Submissions**: Create complaints, generate receipts with hash chain
- **OCR**: Tesseract integration with regex heuristics
- **Clustering**: TF-IDF + DBSCAN for complaint pattern detection
- **Admin**: Cluster management, heatmap data, dispatch simulation

**Database Models**:
- `User`: Phone number, masked citizen ID
- `Submission`: Complaint data, geo coordinates, OCR data, status
- `Receipt`: Hash chain, QR data, kiosk ID
- `Cluster`: Detected complaint clusters, escalation status
- `OTP`: Temporary OTP codes
- `KioskLog`: Kiosk event logging

### Hash Chain Implementation

Receipts use a hash chain for tamper-proof verification:

```
receipt_hash = SHA256(prev_hash + submission_json)
```

- First receipt: `prev_hash = ""` (empty)
- Subsequent receipts: `prev_hash = previous_receipt.receipt_hash`
- Verification: Recompute hash and compare with stored value
- Chain position: Count of receipts before current one for same kiosk

### Clustering Algorithm

1. **Feature Extraction**: TF-IDF vectorization of submission text
2. **Similarity**: Cosine similarity between submissions
3. **Clustering**: DBSCAN (eps=0.3, min_samples=2) on TF-IDF vectors
4. **Escalation**: If cluster size >= 5 within 20 minutes → priority HIGH

### OCR Processing

1. **Image Upload**: Multipart form data to `/ocr/parse`
2. **Tesseract OCR**: Multi-language (eng+hin+tam) text extraction
3. **Regex Parsing**: Heuristics for Indian bill formats:
   - Account number: `\b[0-9A-Z\-]{6,}\b`
   - Amount: `₹?\s?\d+([,]\d{2,3})*(\.\d+)?`
   - Date patterns: Various formats
   - Biller names: Common utility companies
4. **Confidence**: Based on number of extracted fields

### Offline Sync Mechanism

1. **Detection**: `navigator.onLine` API + network error handling
2. **Storage**: IndexedDB with `submissions` object store
3. **Sync Worker**: 
   - Runs every 15 seconds
   - Checks online status
   - Attempts to POST queued submissions
   - Marks as synced on success
   - Stores receipt ID locally

## Security & Compliance

### PII Handling
- **Masking**: All sample data uses masked PII (e.g., `PRASH** K**`)
- **Storage**: Citizen IDs stored as masked strings only
- **No Aadhaar**: No biometric or Aadhaar integration (as per requirements)

### Authentication
- **OTP**: 6-digit codes, 10-minute expiry
- **JWT**: 30-minute token expiry
- **Admin**: Simple password (demo only; production should use proper auth)

### Receipt Integrity
- **Hash Chain**: Prevents tampering with receipt history
- **Verification**: Public endpoint to verify receipt integrity
- **QR Code**: Contains receipt ID + short hash for quick verification

## Deployment

### Docker Compose Services

1. **postgres**: PostgreSQL 15 database
2. **redis**: Redis 7 cache/queue
3. **backend**: FastAPI application (port 8000)
4. **frontend-kiosk**: React dev server (port 3000)
5. **frontend-admin**: React dev server (port 3001)

### Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: Flask secret key
- `JWT_SECRET`: JWT signing secret
- `OCR_LANG`: Tesseract language codes

**Frontend** (via `VITE_*`):
- `VITE_API_URL`: Backend API URL

### Data Seeding

Run `make seed` or `python scripts/seed_data.py` to populate:
- 50 sample utility bills (OCR test data)
- 200 simulated complaints across city area
- Test users and OTPs

## Testing

### Unit Tests
- Backend: `pytest tests/` (pytest)
- Frontend: `npm test` (vitest)

### Integration Tests
- E2E flow: Register → Submit → Admin Cluster
- Smoke tests: `bash scripts/smoke_demo.sh`

### Test Coverage
- Auth flow (OTP request/verify)
- Submission creation
- Receipt verification
- Clustering trigger
- OCR parsing

## Performance Considerations

- **OCR**: Server-side Tesseract for reliability (can be slow; consider async processing)
- **Clustering**: Runs on-demand; can be expensive for large datasets
- **Offline Queue**: IndexedDB handles thousands of submissions efficiently
- **Map Rendering**: Leaflet tiles cached by browser

## Future Enhancements

1. **Real SMS Integration**: Replace console logging with SMS provider
2. **Biometric Auth**: Add fingerprint/face recognition (if required)
3. **Payment Integration**: Sandbox payment gateway
4. **Advanced ML**: Intent classification with transformer models
5. **Mobile App**: React Native version for field workers
6. **Analytics Dashboard**: Complaint trends, resolution times

## Compliance Notes

- **GDPR**: PII masking, data retention policies
- **Aadhaar**: Not integrated (as per requirements)
- **Accessibility**: WCAG 2.1 AA compliance (large touch targets, contrast)
- **Offline-First**: Works without internet (critical for rural areas)
