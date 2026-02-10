# CivicPulse Demo Script

## Quick Start (Make It Hot)

```bash
cd CivicPulse1/CivicPulse
make demo
```

This will:
- Start Docker services (postgres, backend, kiosk, admin)
- Seed 200 submissions + 2 hot clusters + crews
- URLs: Kiosk http://localhost:3000 | Admin http://localhost:3001 | API http://localhost:8000/docs

**One-click seed** (if already running): `make seed` or
```bash
curl -X POST "http://localhost:8000/admin/seed-demo?password=admin123"
```

## 4-Minute WOW CHAIN (Bulletproof Demo)

### Pre-Demo Setup (30 seconds)
1. Run `make demo` (or `cd infra && docker-compose up -d`)
2. Seed: `make seed` or POST /admin/seed-demo
3. Open: Kiosk http://localhost:3000 | Admin http://localhost:3001 | API http://localhost:8000/docs

### The WOW CHAIN (30-45s each step)

1. **KIOSK**: Upload bill photo → OCR fills → "Join existing complaint (N reporters)" → Join → Submit → Receipt with QR + priority + ETA
2. **ADMIN**: Map highlights cluster → Click cluster → Explanation card (keywords, timeline) → Suggest Assign → One-click assign Crew Alpha
3. **ADMIN**: Simulate resolve → Activity feed, heatmap fades, KPI drops
4. **TRACK**: Scan receipt QR → http://localhost:3000/track/{short_code} → Timeline + Verification OK

### Demo Flow

#### Part 1: Kiosk User Journey (2 minutes)

**Step 1: Language Selection (10s)**
- Show kiosk UI at http://localhost:3000
- Click language selector (top right)
- Switch between English, Hindi (हिंदी), Tamil (தமிழ்)
- **Expected**: UI text changes, avatar speaks in selected language

**Step 2: Phone Authentication (30s)**
- Click "Start" button
- Enter phone number: `+919876543210`
- Click "Request OTP"
- **Demo bypass**: Enter OTP `000000` to skip verification
- **Expected**: Redirected to submission page

**Step 3: Photo Upload & OCR (40s)**
- Click "Upload Photo" area
- Upload a sample utility bill image (or use provided sample)
- **Expected**: Image preview appears
- **Expected**: OCR form fields appear below with pre-filled data:
  - Name, Account Number, Address, Biller, Amount, Date
- Edit any field to show it's editable
- **Expected**: Confidence score displayed

**Step 4: Submit Complaint (20s)**
- Select issue type: "Water Outage"
- Enter complaint text: "No water supply for 3 days in my area"
- Click "Submit"
- **Expected**: Receipt page appears with QR code
- **Expected**: Receipt ID, hash, and QR code visible
- Click "Print Receipt" (shows print preview)

**Step 5: Receipt Verification (20s)**
- Note the receipt ID from the receipt page
- Open new tab: `http://localhost:8000/receipt/{receipt_id}/verify`
- **Expected**: JSON response shows `"verification": "OK"` and `chain_position`

#### Part 2: Admin Dashboard (1.5 minutes)

**Step 6: Admin Login (10s)**
- Open Admin Dashboard: http://localhost:3001
- Enter password: `admin123`
- Click "Login"
- **Expected**: Dashboard loads

**Step 7: View Heatmap & Clusters (30s)**
- **Expected**: Map shows:
  - Submission markers (blue pins)
  - Cluster circles (colored by priority)
  - Escalated clusters highlighted in red
- Point out cluster boundaries and sizes
- **Expected**: Cluster list below map shows clusters with escalation status

**Step 8: Trigger Clustering (20s)**
- Click "Run Clustering Analysis" button
- **Expected**: Alert: "Clustering completed. Found X clusters."
- **Expected**: Map updates with new clusters
- **Expected**: Escalation alerts appear if threshold exceeded

**Step 9: Simulate Dispatch (30s)**
- Scroll to submissions table
- Select 2-3 submissions (checkboxes)
- Click "Simulate Dispatch" button
- **Expected**: Alert: "Updated X submissions"
- **Expected**: Selected submissions show status "assigned" and priority "high"
- **Expected**: Table refreshes

### Part 3: Offline Mode Demo (30 seconds)

**Step 10: Offline Queue (30s)**
- In kiosk UI, disconnect network (or stop backend: `docker-compose stop backend`)
- **Expected**: Yellow banner: "Queued for Sync"
- Submit a new complaint
- **Expected**: Alert: "Saved to offline queue. Will sync when online."
- Reconnect network (or restart backend: `docker-compose start backend`)
- Wait 15 seconds
- **Expected**: Submission automatically syncs (check admin dashboard for new submission)

### Expected Server Logs

During demo, watch terminal for:
```
==================================================
OTP REQUESTED for phone: +919876543210
OTP CODE: 123456
==================================================
```

### Key Points to Highlight

1. **Multilingual Support**: Seamless language switching with TTS
2. **OCR Auto-fill**: Reduces data entry time
3. **Offline-First**: Works without internet, syncs automatically
4. **Hash Chain Receipts**: Tamper-proof, verifiable receipts
5. **Smart Clustering**: Automatic detection of complaint patterns
6. **Auto-Escalation**: Alerts when threshold exceeded
7. **Touch-Optimized**: Large buttons, accessible design

### Validation Commands

```bash
# Smoke tests
cd backend && DEMO_MODE=true pytest tests/test_smoke.py -v

# Manual API checks
curl http://localhost:8000/health
curl -X POST "http://localhost:8000/admin/seed-demo?password=admin123"
curl -X POST "http://localhost:8000/admin/run-clustering?password=admin123"
curl "http://localhost:8000/receipt/{receipt_id}/verify"
curl "http://localhost:8000/track/{short_code}"
```

### Troubleshooting

- **OTP not showing**: Use demo bypass code `000000` in DEMO_MODE
- **Map not loading**: Check internet (Leaflet tiles) or use offline tiles
- **OCR fails**: Ensure Tesseract in backend container; demo works without OCR
- **Clustering empty**: Run `make seed` first, then "Run Clustering"
- **Join flow fails**: Ensure seed created clusters; duplicate-check uses 24h window

### Demo Timing Breakdown

- Setup: 30s
- Kiosk Journey: 2:00
- Admin Dashboard: 1:30
- Offline Demo: 0:30
- **Total: ~4:30** (with buffer for questions)
