# backend/main.py
# ----------------------------------------------------------
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from spacetrack import SpaceTrackClient
from skyfield.api import load, EarthSatellite
from datetime import datetime, timedelta, timezone
import math, os, dotenv

# ────────────────────────────────
# Environment setup
# ────────────────────────────────
dotenv.load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
USER = os.getenv("SPACETRACK_USER")
PASS = os.getenv("SPACETRACK_PASS")
if not USER or not PASS:
    raise RuntimeError("Space‑Track credentials missing in .env")

ts = load.timescale()

# ────────────────────────────────
# FastAPI + CORS
# ────────────────────────────────
app = FastAPI(title="Space Debris API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────
# Data model
# ────────────────────────────────
class Debris(BaseModel):
    name: str
    lat:  float
    lon:  float
    alt_km: float

# ────────────────────────────────
# Helpers
# ────────────────────────────────
def fetch_valid_debris(limit: int = 40) -> list[Debris]:
    """Fetch recent debris with finite lat/lon."""
    cl = SpaceTrackClient(identity=USER, password=PASS)
    try:
        raw = cl.gp(
            epoch=">now-30",
            object_type="DEBRIS",
            orderby="epoch desc",
            format="tle",
            limit=1000,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Space‑Track error: {e}")

    lines = raw.splitlines()
    if len(lines) < 2:
        raise HTTPException(status_code=404, detail="No debris TLEs returned.")

    pairs = [(lines[i], lines[i + 1]) for i in range(0, len(lines) - 1, 2)]

    good: list[Debris] = []
    t_now = ts.utc(datetime.now(timezone.utc))

    for l1, l2 in pairs:
        try:
            sat = EarthSatellite(l1, l2, None, ts)
            sub = sat.at(t_now).subpoint()
            lat, lon = sub.latitude.degrees, sub.longitude.degrees
            if math.isfinite(lat) and math.isfinite(lon):
                good.append(
                    Debris(
                        name=sat.name or f"DEBRIS-{len(good)+1}",
                        lat=lat,
                        lon=lon,
                        alt_km=sub.elevation.km,
                    )
                )
                if len(good) >= limit:
                    break
        except Exception:
            continue

    if not good:
        raise HTTPException(
            status_code=404,
            detail="No valid debris found in last 30 days."
        )
    return good


def compute_stats(objs: list[Debris]) -> dict:
    """Aggregate quick stats for a collection of debris objects."""
    if not objs:
        return {"count": 0, "min_alt": 0, "max_alt": 0, "avg_alt": 0}
    alts = [o.alt_km for o in objs]
    return {
        "count": len(objs),
        "min_alt": min(alts),
        "max_alt": max(alts),
        "avg_alt": round(sum(alts) / len(alts), 2),
    }

# ────────────────────────────────
# Routes
# ────────────────────────────────
@app.get("/", summary="Health‑check")
def root():
    return {"status": "ok", "time": datetime.utcnow()}

@app.get("/debris", response_model=list[Debris])
def current_debris(max: int = Query(25, ge=1, le=100)):
    """Return up‑to‑date debris positions."""
    return fetch_valid_debris(max)

@app.get("/predict", response_model=list[Debris])
def predict_debris(
    minutes: int = Query(30, ge=1, le=120),
    max: int = Query(25,  ge=1, le=100),
):
    """(Placeholder) simple forward propagation."""
    future = ts.utc(datetime.now(timezone.utc) + timedelta(minutes=minutes))
    # Currently just returns same objects; refine later
    return fetch_valid_debris(max)

# ── NEW live‑stats endpoint ──────────────────────────────
@app.get("/stats")
def debris_stats(max: int = Query(100, ge=1, le=1000)):
    """Simple live stats (count / min / max / avg altitude)."""
    return compute_stats(fetch_valid_debris(max))
# ─────────────────────────────────────────────────────────
