/* src/app/globe/page.tsx
   ----------------------- */
'use client';

import { useEffect, useState } from 'react';
import CesiumGlobe, { Debris } from '@/components/CesiumGlobe';

type Stats = {
  count:   number;
  min_alt: number;
  avg_alt: number;
  max_alt: number;
};

export default function GlobePage() {
  /** state */
  const [debris,   setDebris]   = useState<Debris[]>([]);
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showPath, setShowPath] = useState<boolean>(true);

  /* ───────────────── fetch debris + stats every 10 s ───────────── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        /* Debris */
        const r = await fetch('http://127.0.0.1:8000/debris');
        if (r.ok) {
          const data = await r.json();
          setDebris(data);
        }
        /* Stats */
        const rs = await fetch('http://127.0.0.1:8000/stats');
        if (rs.ok) {
          const s = await rs.json();
          setStats(s);
        }
      } catch (err) {
        console.error('fetch error', err);
      }
    };
    fetchData();
    const id = setInterval(fetchData, 10_000);
    return () => clearInterval(id);
  }, []);

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen text-white bg-slate-950">
      {/* ───────────── sidebar ───────────── */}
      <aside className="w-72 shrink-0 border-r border-slate-800 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">🛰️ Space Debris</h2>

        {/* Stats block */}
        {stats && (
          <div className="mb-4 space-y-1 text-sm bg-slate-800/50 p-2 rounded">
            <div>Count: <b>{stats.count}</b></div>
            <div>Min alt: {stats.min_alt.toFixed(1)} km</div>
            <div>Avg alt: {stats.avg_alt.toFixed(1)} km</div>
            <div>Max alt: {stats.max_alt.toFixed(1)} km</div>
          </div>
        )}

        {/* Path toggle */}
        <label className="flex items-center gap-2 mb-4 select-none">
          <input
            type="checkbox"
            checked={showPath}
            onChange={(e) => setShowPath(e.target.checked)}
          />
          <span>Show path</span>
        </label>

        {/* Clear selection */}
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="mb-2 text-xs text-purple-300 hover:text-purple-200"
          >
            ✕ Clear selection
          </button>
        )}

        {/* List of debris */}
        {debris.map((d) => (
          <button
            key={d.name}
            onClick={() => setSelected(d.name)}
            className={`block w-full text-left px-2 py-1 rounded mb-1 transition 
              ${
                selected === d.name
                  ? 'bg-fuchsia-600'
                  : 'hover:bg-slate-700/70'
              }`}
          >
            {d.name}
          </button>
        ))}
      </aside>

      {/* ───────────── globe pane ───────────── */}
      <main className="flex-1 relative">
        <CesiumGlobe
          debris={debris}
          selected={selected}
          showPath={showPath}
          onSelect={setSelected}
        />
      </main>
    </div>
  );
}
