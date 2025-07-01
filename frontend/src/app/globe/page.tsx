'use client';

import { useEffect, useState } from 'react';
import CesiumGlobe, { Debris } from '@/components/CesiumGlobe';

export default function GlobePage() {
  const [debris, setDebris]     = useState<Debris[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showPath, setShowPath] = useState<boolean>(true);

  /* fetch every 10 s */
  useEffect(() => {
    const fetcher = async () => {
      try {
        const r = await fetch('http://127.0.0.1:8000/debris');
        if (r.ok) {
          const data = await r.json();
          console.log('🛰️ received', data.length, 'objects'); // ← debug line
          setDebris(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetcher();
    const id = setInterval(fetcher, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen">
      {/* sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-4 overflow-y-auto">
        <h2 className="font-bold mb-3">Space Debris</h2>

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={showPath}
            onChange={(e) => setShowPath(e.target.checked)}
          />
          Show path
        </label>

        {debris.map((d) => (
          <button
            key={d.name}
            onClick={() => setSelected(d.name)}
            className={`block w-full text-left px-2 py-1 rounded mb-1 ${
              selected === d.name
                ? 'bg-fuchsia-600'
                : 'hover:bg-slate-700'
            }`}
          >
            {d.name}
          </button>
        ))}
      </aside>

      {/* globe */}
      <div className="flex-1">
        <CesiumGlobe
          debris={debris}
          selected={selected}
          showPath={showPath}
          onSelect={setSelected}
        />
      </div>
    </div>
  );
}
