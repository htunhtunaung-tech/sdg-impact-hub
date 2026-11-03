"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  href?: string;
  color?: string;
}

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

function pin(L: typeof Leaflet, color = "#14532d") {
  return L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg"><path d="M14 35s12-11.6 12-21A12 12 0 0 0 2 14c0 9.4 12 21 12 21z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>`,
  });
}

/** OpenStreetMap via Leaflet. Shows markers; optionally lets the user pick a point. */
export function LeafletMap({
  points,
  className,
  zoom = 12,
  onPick,
  picked,
}: {
  points: MapPoint[];
  className?: string;
  zoom?: number;
  onPick?: (p: { lat: number; lng: number }) => void;
  picked?: { lat: number; lng: number } | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = lib;
      const first = picked ?? points[0] ?? { lat: 16.4419, lng: 102.836 };
      map.current = lib.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([first.lat, first.lng], zoom);
      lib.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map.current);
      layer.current = lib.layerGroup().addTo(map.current);
      map.current.on("click", (e: Leaflet.LeafletMouseEvent) => pickRef.current?.({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }));
      draw();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    const lib = L.current;
    if (!lib || !map.current || !layer.current) return;
    layer.current.clearLayers();
    const all = picked ? [{ ...picked, label: "Selected location" }] : points;
    for (const p of all) {
      const m = lib.marker([p.lat, p.lng], { icon: pin(lib, p.color), keyboard: true, title: p.label });
      if (p.label) {
        const div = document.createElement("div");
        if (p.href) {
          const a = document.createElement("a");
          a.href = p.href;
          a.textContent = p.label;
          a.style.fontWeight = "600";
          div.appendChild(a);
        } else div.textContent = p.label;
        m.bindPopup(div);
      }
      m.addTo(layer.current);
    }
    if (all.length > 1) map.current.fitBounds(lib.latLngBounds(all.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 13 });
    else if (all[0]) map.current.setView([all[0].lat, all[0].lng], map.current.getZoom());
  };

  useEffect(draw, [points, picked]);

  return <div ref={el} className={className} role="region" aria-label="Map" />;
}
