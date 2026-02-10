# Run CivicPulse Without Docker

You only need **Python** and **Node.js** installed. No Docker, no PostgreSQL, no Redis.

---

## 1. Install (one time)

1. **Python 3.11**  
   https://www.python.org/downloads/  
   - During install, check **"Add Python to PATH"**.

2. **Node.js 20**  
   https://nodejs.org/  
   - Use the LTS version.

---

## 2. Run (CMD way)

Open **3 CMD windows**. Use these paths if your project is on Desktop:

```
C:\Users\hansr\OneDrive\Desktop\CivicPulse
```

### CMD 1 – Backend (API)

```cmd
cd C:\Users\hansr\OneDrive\Desktop\CivicPulse\backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Leave this window open. When you see **"Uvicorn running"**, the API is ready.

---

### CMD 2 – Kiosk (citizen screen)

```cmd
cd C:\Users\hansr\OneDrive\Desktop\CivicPulse\frontend-kiosk
npm install
npm run dev
```

Leave this open. When it says **"Local: http://localhost:3000"**, the kiosk is ready.

---

### CMD 3 – Admin (dashboard)

```cmd
cd C:\Users\hansr\OneDrive\Desktop\CivicPulse\frontend-admin
npm install
npm run dev
```

Leave this open. When it says **"Local: http://localhost:3001"**, the admin is ready.

---

## 3. Open in browser

- **Kiosk:** http://localhost:3000  
- **Admin:** http://localhost:3001  
- **API docs:** http://localhost:8000/docs  

---

## 4. (Optional) Add sample data

After the backend is running (CMD 1), open a **4th CMD** and run:

```cmd
cd C:\Users\hansr\OneDrive\Desktop\CivicPulse\backend
python -c "import sys; sys.path.insert(0, '..'); exec(open('../scripts/seed_data.py').read())"
```

Or from project root:

```cmd
cd C:\Users\hansr\OneDrive\Desktop\CivicPulse
set DATABASE_URL=
python backend\app\main.py
```

Easier: just use the app; it will create the DB and you can add data from the kiosk.

---

## 5. Stop

In each of the 3 CMD windows press **Ctrl + C** to stop that part.

---

## Short version

1. Install Python + Node.js.  
2. In 3 separate CMD windows run:  
   - `backend`: `pip install -r requirements.txt` then `python -m uvicorn app.main:app --reload --port 8000`  
   - `frontend-kiosk`: `npm install` then `npm run dev`  
   - `frontend-admin`: `npm install` then `npm run dev`  
3. Open http://localhost:3000 (kiosk) and http://localhost:3001 (admin).

No Docker needed.
