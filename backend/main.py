# backend/main.py
# ----------------------------------------------------------
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from spacetrack import SpaceTrackClient
from skyfield.api import load, EarthSatellite
from datetime import datetime, timedelta, timezone
import math, os, dotenv, typing as t

# ────────────────────────────────
# Environment setup
# ────────────────────────────────
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
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
    allow_origins=["*"],      # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────
# Pydantic model
# ────────────────────────────────
class Debris(BaseModel):
    name: str
    lat:  float
    lon:  float
    alt_km: float

# ────────────────────────────────
#  Simple in‑memory cache (1 hour)
# ────────────────────────────────
CACHE_TTL = 3600  # seconds
_cache_data: list[Debris] | None = None
_cache_time: datetime | None = None


def _space_track_tle_query() -> str:
    """One GP request (once per hour)."""
    cl = SpaceTrackClient(identity=USER, password=PASS)
    return cl.gp(
        epoch=">now-30",
        object_type="DEBRIS",
        orderby="epoch desc",
        format="tle",
        limit=1000,
    )


def _refresh_cache() -> None:
    """Download TLEs and build the Debris list."""
    global _cache_data, _cache_time

    try:
        raw = _space_track_tle_query()
    except Exception as e:
        raise HTTPException(500, f"Space‑Track error: {e}")

    lines = raw.splitlines()
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
        except Exception:
            continue

    _cache_data = good
    _cache_time = datetime.utcnow()


def _get_cached(limit: int) -> list[Debris]:
    """Return cached list, refreshing if TTL expired."""
    now = datetime.utcnow()
    if _cache_data is None or _cache_time is None or (now - _cache_time).total_seconds() > CACHE_TTL:
        _refresh_cache()

    # _cache_data is guaranteed non‑None here
    if not _cache_data:
        raise HTTPException(404, "No valid debris found in last 30 days.")
    return _cache_data[:limit]


# ────────────────────────────────
# Util: quick stats
# ────────────────────────────────
def compute_stats(objs: list[Debris]) -> dict[str, t.Any]:
    if not objs:
        return {"count": 0, "min_alt": 0, "max_alt": 0, "avg_alt": 0}
    alts = [o.alt_km for o in objs]
    return {
        "count": len(objs),
        "min_alt": round(min(alts), 2),
        "max_alt": round(max(alts), 2),
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
    return _get_cached(max)


@app.get("/stats")
def debris_stats(max: int = Query(100, ge=1, le=1000)):
    return compute_stats(_get_cached(max))


@app.get("/predict", response_model=list[Debris])
def predict_debris(
    minutes: int = Query(30, ge=1, le=120),
    max: int = Query(25, ge=1, le=100),
):
    """
    Dummy forward‑propagation endpoint (returns same list for now).
    In future you can propagate each satellite `minutes` ahead.
    """
    return _get_cached(max)
