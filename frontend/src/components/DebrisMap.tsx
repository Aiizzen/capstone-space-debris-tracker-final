'use client';

import { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ---------- Fix Leaflet default marker icons ---------- */
import marker2x from 'leaflet/dist/images/marker-icon-2x.png';
import marker1x from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x.src ?? marker2x,
  iconUrl: marker1x.src ?? marker1x,
  shadowUrl: markerShadow.src ?? markerShadow,
});

/* ---------- Data type ---------- */
type Debris = {
  name: string;
  lat: number;
  lon: number;
  alt_km: number;
};

export default function DebrisMap() {
  const [debris, setDebris] = useState<Debris[]>([]);
  const [maxAlt, setMaxAlt] = useState(1500);          // km
  const timer = useRef<NodeJS.Timeout>();

  /* -------- Fetch + auto-refresh every 10 s -------- */
  useEffect(() => {
    const load = () =>
      fetch('http://127.0.0.1:8000/debris?max=200')
        .then((r) => r.json())
        .then((json) => Array.isArray(json) && setDebris(json))
        .catch(console.error);

    load();                            // first call
    timer.current = setInterval(load, 10_000);   // 10 000 ms
    return () => timer.current && clearInterval(timer.current);
  }, []);

  /* -------- Filter by altitude slider -------- */
  const filtered = debris.filter((d) => d.alt_km <= maxAlt);

  /* -------- Center map on first marker -------- */
  const Center = () => {
    const map = useMap();
    useEffect(() => {
      if (filtered.length) map.setView([filtered[0].lat, filtered[0].lon], 2);
    }, [filtered, map]);
    return null;
  };

  return (
    <div className="h-full w-full relative">
      {/* ----- Altitude slider overlay ----- */}
      <div className="absolute z-[1000] top-4 left-1/2 -translate-x-1/2 bg-gray-800/80 backdrop-blur px-4 py-2 rounded text-gray-100 flex items-center gap-3">
        <span className="whitespace-nowrap">Max Alt (km)</span>
        <input
          type="range"
          min={200}
          max={2000}
          step={50}
          value={maxAlt}
          onChange={(e) => setMaxAlt(Number(e.target.value))}
          className="accent-sky-400 w-40"
        />
        <span className="w-12 text-right">{maxAlt}</span>
        <span className="ml-4 text-sm text-gray-400">
          {filtered.length}/{debris.length}
        </span>
      </div>

      {/* ----- Leaflet map ----- */}
      <MapContainer
        className="h-full w-full"
        center={[0, 0]}
        zoom={2}
        worldCopyJump
      >
        <Center />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {filtered.map((d, i) => (
          <Marker key={i} position={[d.lat, d.lon]}>
            <Popup>
              <b>{d.name}</b>
              <br />
              Alt&nbsp;{d.alt_km.toFixed(0)}&nbsp;km
              <br />
              {d.lat.toFixed(2)}°, {d.lon.toFixed(2)}°
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
