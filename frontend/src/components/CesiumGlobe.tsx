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
  DistanceDisplayCondition,   // 🆕 import
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

/* ---------- type coming from backend ---------- */
export type Debris = { name: string; lat: number; lon: number; alt_km: number };

/* ---------- Cesium access token ---------- */
Ion.defaultAccessToken =
  process.env.NEXT_PUBLIC_CESIUM_TOKEN || 'REPLACE_ME_WITH_YOUR_TOKEN';

/* ---------- props passed from parent ---------- */
interface Props {
  debris: Debris[];
  selected: string | null;
  showPath: boolean;
  onSelect: (name: string | null) => void;
}

/** keep Cesium’s sunlight synced every tick */
function attachDynamicSun(viewer: Viewer) {
  viewer.clock.onTick.addEventListener(() => {
    viewer.scene.light = new SunLight();
  });
}

export default function CesiumGlobe({
  debris,
  selected,
  showPath,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef    = useRef<Viewer | null>(null);

  const [viewerReady, setViewerReady] = useState(false);
  const [trail, setTrail]             = useState<Entity | null>(null);

  /* ─────────── create viewer once ─────────── */
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // @ts‑ignore – global for static assets
    window.CESIUM_BASE_URL = '/Cesium';

    (async () => {
      const terrain =
        (await createWorldTerrainAsync().catch(() => undefined)) ||
        new EllipsoidTerrainProvider();

      if (!containerRef.current) return;
      const viewer = new Viewer(containerRef.current, {
        terrainProvider: terrain,
        geocoder: false,
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        fullscreenButton: false,
        requestRenderMode: true,
        maximumRenderTimeChange: 1,
        shouldAnimate: false,
        sceneModePicker: true,
      });

      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = true;
      attachDynamicSun(viewer);

      viewerRef.current = viewer;
      setViewerReady(true);
    })();
  }, []);

  /* ─────────── refresh red dots whenever debris changes ─────────── */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;

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
          font: '12px sans‑serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          // ✅ use Cesium object (no TS error)
          distanceDisplayCondition: new DistanceDisplayCondition(0.0, 2_000_000.0),
        },
      })
    );

    v.scene.requestRender();
  }, [debris, viewerReady]);

  /* ─────────── focus + cyan trail when selection changes ─────────── */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;

    // clear old trail
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
        const lonDrift = target.lon + 0.05 * m; // fake drift just for line
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
  }, [selected, showPath, viewerReady, debris, trail]);

  /* ─────────── click‑select handler ─────────── */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;

    const handler = new ScreenSpaceEventHandler(v.scene.canvas);
    handler.setInputAction((evt) => {
      const picked = v.scene.pick(evt.position);
      if (picked && picked.id?.name) onSelect(picked.id.name);
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => handler.destroy();
  }, [onSelect, viewerReady]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', position: 'relative' }}
    />
  );
}
