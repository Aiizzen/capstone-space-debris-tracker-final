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

export type Debris = { name: string; lat: number; lon: number; alt_km: number };

Ion.defaultAccessToken =
  process.env.NEXT_PUBLIC_CESIUM_TOKEN || 'REPLACE_ME_WITH_YOUR_TOKEN';

interface Props {
  debris: Debris[];
  selected: string | null;
  showPath: boolean;
  onSelect: (name: string | null) => void;
}

/** Keep sun synced to Cesium simulation time */
function attachDynamicSun(viewer: Viewer) {
  viewer.clock.onTick.addEventListener(() => {
    viewer.scene.light = new SunLight(); // updates light every tick
  });
}

export default function CesiumGlobe({
  debris,
  selected,
  showPath,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [trail, setTrail] = useState<Entity | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // @ts-ignore
    window.CESIUM_BASE_URL = '/Cesium';

    (async () => {
      const terrain =
        (await createWorldTerrainAsync().catch(() => undefined)) ||
        new EllipsoidTerrainProvider();

      if (!containerRef.current) return;

const viewer = new Viewer(containerRef.current as Element, {
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
      attachDynamicSun(viewer); // 🌞 dynamic sun movement

      viewerRef.current = viewer;
      setViewerReady(true);
    })();
  }, []);

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

  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;

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

  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !viewerReady) return;
    const h = new ScreenSpaceEventHandler(v.scene.canvas);

    h.setInputAction((e: any) => {
      const picked = v.scene.pick(e.position);
      if (picked && picked.id?.name) {
        onSelect(picked.id.name);
      }
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