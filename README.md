# 🚀 Space Debris Tracker

A real-time, full-stack web application that visualizes space debris orbiting Earth. Built using FastAPI for the backend and Next.js with CesiumJS for the frontend.

![screenshot](./frontend/public/globe.svg)

## 🌐 Live Demo

> Coming soon… (optional: add Vercel or Render deployment URL here)

---

## 📦 Project Structure


---

## ⚙️ Tech Stack

### Backend (FastAPI)
- Python 3.11+
- FastAPI
- Skyfield (orbital computation)
- Space-Track.org API (TLE data)

### Frontend (Next.js + CesiumJS)
- React (TypeScript)
- Tailwind CSS
- CesiumJS for 3D Earth & orbital path rendering
- Deployed with Vercel

---

## 🚧 Features

✅ Real-time space debris positions  
✅ 3D Earth globe with CesiumJS  
✅ Altitude-based color coding  
✅ Hover + click popup info  
✅ Filter by altitude range  
✅ Debris path toggle  
✅ Day/night lighting  
✅ Fully responsive frontend

---

## 📡 How It Works

1. **Backend** fetches valid TLE (Two Line Element) data for orbital debris from space-track.org.
2. **Skyfield** is used to compute current and future positions of debris in orbit.
3. **FastAPI** serves this position data as a JSON API.
4. **Frontend** consumes this data, displays it on a 3D globe using Cesium, and allows user interaction.

---

## 🚀 Getting Started (Dev Mode)

### Backend (FastAPI)


```bash
cd backend
python -m venv venv
venv\Scripts\activate     # On Windows
pip install -r requirements.txt
uvicorn main:app --reload

✨ Credits
Skyfield

CesiumJS

Space-Track.org

Next.js

FastAPI
 
 📜 License
This project is open source and available under the MIT License.