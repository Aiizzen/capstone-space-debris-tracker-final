/*  src/components/CesiumGlobe.tsx
    ───────────────────────────────────────────── */
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Viewer,
  Ion,
  createWorldTerrainAsync,
  EllipsoidTerrainProvider,
  Cartesian3,
  Color,
  Entity,
  PolylineGraphics,
  SampledPositionProperty,
  JulianDate,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SunLight,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

/* ---------- type coming from backend ---------- */
export type Debris = { name: string; lat: number; lon: number; alt_km: number };

/* ---------- token (only once) ---------- */
Ion.defaultAccessToken =
  process.env.NEXT_PUBLIC_CESIUM_TOKEN || 'REPLACE_ME_WITH_YOUR_TOKEN';

/* ---------- props ---------- */
interface Props {
  debris: Debris[];
  selected: string | null;
  showPath: boolean;
  onSelect: (name: string | null) => void;
}

export default function CesiumGlobe({
  debris,
  selected,
  showPath,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const [viewerReady, setViewerReady] = useState(false); // ← flag
  const [trail, setTrail] = useState<Entity | null>(null);

  /* ─────────── create Cesium viewer (once) ─────────── */
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // @ts-ignore  (tell Cesium where assets are)
    window.CESIUM_BASE_URL = '/Cesium';

    (async () => {
      const terrain =
        (await createWorldTerrainAsync().catch(() => undefined)) ||
        new EllipsoidTerrainProvider();

      const viewer = new Viewer(containerRef.current, {
        terrainProvider: terrain,
        geocoder: false,
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        fullscreenButton: false,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        shouldAnimate: true,
        sceneModePicker: true,
      });

      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.light = new SunLight();

      viewerRef.current = viewer;
      setViewerReady(true); // ✅ now we can add entities
    })();
  }, []);

  /* ─────────── add / refresh red dots ─────────── */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;

    // remove previous dots
    v.entities.values
      .filter((e) => e.id.startsWith('DEB:'))
      .forEach((e) => v.entities.remove(e));

    debris.forEach((d) =>
      v.entities.add({
        id: `DEB:${d.name}`,
        name: d.name,
        position: Cartesian3.fromDegrees(d.lon, d.lat, d.alt_km * 1000),
        point: {
          pixelSize: 5,
          color: Color.WHITE,
          outlineColor: Color.BURLYWOOD,
          outlineWidth: 1,
        },
        label: {
          text: d.name,
          font: '12px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          distanceDisplayCondition: { near: 0, far: 2_000_000 },
        },
      })
    );

    v.scene.requestRender();
  }, [debris, viewerReady]);

  /* ─────────── focus + optional cyan trail ─────────── */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;

    // remove older trail
    if (trail) {
      v.entities.remove(trail);
      setTrail(null);
    }
    if (!selected) return;

    const target = debris.find((d) => d.name === selected);
    if (!target) return;

    v.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        target.lon,
        target.lat,
        target.alt_km * 1000 + 800_000
      ),
      duration: 1.5,
    });

    if (showPath) {
      const pos = new SampledPositionProperty();
      for (let m = -5; m <= 5; m++) {
        const when = JulianDate.fromDate(new Date(Date.now() + m * 60_000));
        // tiny fake drift so the line is visible
        const lonDrift = target.lon + 0.05 * m;
        pos.addSample(
          when,
          Cartesian3.fromDegrees(lonDrift, target.lat, target.alt_km * 1000)
        );
      }
      const ent = v.entities.add({
        polyline: {
          positions: pos,
          width: 2,
          material: Color.CYAN,
          clampToGround: false,
        } as PolylineGraphics,
      });
      setTrail(ent);
    }
    v.scene.requestRender();
  }, [selected, showPath, viewerReady]);

  /* ─────────── click‑to‑select handler ─────────── */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;
    const h = new ScreenSpaceEventHandler(v.scene.canvas);

    h.setInputAction((e: any) => {
      const picked = v.scene.pick(e.position);
      if (picked && picked.id?.name) onSelect(picked.id.name);
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => h.destroy();
  }, [onSelect, viewerReady]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', position: 'relative' }}
    />
  );
}
