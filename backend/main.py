from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from spacetrack import SpaceTrackClient
from skyfield.api import load, EarthSatellite
from datetime import datetime, timedelta, timezone
import math, os, dotenv

# ────────────────────────────────
# Env setup
# ────────────────────────────────
dotenv.load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
USER = os.getenv("SPACETRACK_USER")
PASS = os.getenv("SPACETRACK_PASS")
if not USER or not PASS:
    raise RuntimeError("Space-Track credentials missing in .env")

ts = load.timescale()

# ────────────────────────────────
# FastAPI app + CORS
# ────────────────────────────────
app = FastAPI(title="Space Debris API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────
# Response model
# ────────────────────────────────
class Debris(BaseModel):
    name: str
    lat: float
    lon: float
    alt_km: float

# ────────────────────────────────
# Debris fetch helper
# ────────────────────────────────
def fetch_valid_debris(limit: int = 40):
    """Fetch space debris with valid lat/lon from Space-Track."""
    cl = SpaceTrackClient(identity=USER, password=PASS)
    try:
        raw = cl.gp(
            epoch=">now-30",               # changed from 7 to 30 days
            object_type="DEBRIS",
            orderby="epoch desc",
            format="tle",
            limit=1000,                    # increased limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Space-Track error: {e}")

    lines = raw.splitlines()
    if len(lines) < 2:
        raise HTTPException(status_code=404, detail="No valid debris TLEs returned.")

    pairs = [(lines[i], lines[i + 1]) for i in range(0, len(lines) - 1, 2)]

    good = []
    now_dt = datetime.now(timezone.utc)
    t_now  = ts.utc(now_dt)

    for l1, l2 in pairs:
        try:
            sat = EarthSatellite(l1, l2, None, ts)
            sub = sat.at(t_now).subpoint()
            lat, lon = sub.latitude.degrees, sub.longitude.degrees
            if math.isfinite(lat) and math.isfinite(lon):
                good.append(Debris(
                    name=sat.name or f"DEBRIS-{len(good)+1}",
                    lat=lat,
                    lon=lon,
                    alt_km=sub.elevation.km
                ))
            if len(good) >= limit:
                break
        except Exception:
            continue

    if not good:
        raise HTTPException(status_code=404, detail="No valid debris found in last 30 days.")

    return good

# ────────────────────────────────
# Routes
# ────────────────────────────────
@app.get("/", summary="Health-check")
def root():
    return {"status": "ok", "time": datetime.utcnow()}

@app.get("/debris", response_model=list[Debris])
def current_debris(max: int = Query(25, ge=1, le=100)):
    try:
        return fetch_valid_debris(max)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict", response_model=list[Debris])
def predict_debris(
    minutes: int = Query(30, ge=1, le=120),
    max: int = Query(25, ge=1, le=100),
):
    try:
        now_dt = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        t_future = ts.utc(now_dt)
        objs = fetch_valid_debris(max)
        predicted = []
        for obj in objs:
            predicted.append(obj)
        return predicted
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
