'use client';
import { useEffect, useState } from 'react';

type Stats = { count: number; min_alt: number; max_alt: number; avg_alt: number };

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch('http://127.0.0.1:8000/stats');
        if (r.ok) setStats(await r.json());
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  if (!stats) return <div className="p-4 bg-gray-800 text-white">Loading stats…</div>;

  return (
    <div className="p-4 bg-gray-800 text-white rounded shadow text-sm">
      <h3 className="font-bold mb-2">📊 Live Debris Stats</h3>
      <div>Total: {stats.count}</div>
      <div>Min alt: {stats.min_alt.toFixed(0)} km</div>
      <div>Max alt: {stats.max_alt.toFixed(0)} km</div>
      <div>Avg alt: {stats.avg_alt.toFixed(0)} km</div>
      <p className="text-xs opacity-60 mt-1">updates every 10 s</p>
    </div>
  );
}
