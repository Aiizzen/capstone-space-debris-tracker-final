 🚀 Space Debris Tracker

A real‑time, full‑stack web application that visualises orbital debris around Earth.  
**Backend:** FastAPI + Skyfield + Space‑Track API  
**Frontend:** Next.js (React + TypeScript) + CesiumJS + Tailwind CSS

![Screenshot](./frontend/public/screenshot.png)

---

## 🌐 Live Demo
<!-- Add your URL once deployed -->
> Coming soon …  

---

## 📦 Project Structure

space‑debris‑tracker/
├── backend/ # FastAPI + Skyfield
│ ├── main.py
│ ├── requirements.txt
│ └── …
├── frontend/ # Next.js + CesiumJS
│ ├── next.config.ts
│ ├── package.json
│ ├── public/
│ └── src/
├── .gitignore
├── README.md
└── LICENSE

---

## ⚙️ Tech Stack

### Backend
- **Python 3.11+**
- **FastAPI**
- **Skyfield** – orbital mechanics
- **Space‑Track.org** – authoritative TLE source

### Frontend
- **Next.js 15 (App Router, TS)**
- **React 19**
- **Tailwind CSS v4**
- **CesiumJS 1.130** – 3D Globe / 3D Tiles
- Deployed on **Vercel** (suggested)

---

## 🚧 Core Features

| Status | Feature |
| :----: | ------- |
| ✅ | Real‑time debris positions (auto‑refresh) |
| ✅ | 3D Earth with day / night lighting |
| ✅ | Altitude‑based colour coding |
| ✅ | Hover & click popup information |
| ✅ | Altitude range slider filter |
| ✅ | Toggle future / past debris path |
| ✅ | Fully responsive UI |

---

## 📡 Data Flow – _How it works_

1. **FastAPI** fetches recent TLEs for *debris only* from Space‑Track.  
2. **Skyfield** converts each TLE into a satellite object and computes the current sub‑point (`lat`, `lon`, `alt`).  
3. The backend exposes this data at `GET /debris`.  
4. The **Next.js** frontend polls `/debris` every 10 seconds and updates Cesium entities.  
5. Cesium renders debris markers, optional ±5 min trail, and applies day/night lighting to the globe.

---

## 🛠 Getting Started (Dev Mode)

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload

2. Frontend (Next.js + Cesium)
bash
Copy code
cd frontend
npm install
npm run dev
Frontend runs at http://localhost:3000


🙏 Credits
Skyfield (MIT)

CesiumJS (Apache‑2.0)

Space‑Track.org – TLE data provider

Next.js, React, FastAPI

📄 License
This project is open-source under the MIT License – see LICENSE for details.