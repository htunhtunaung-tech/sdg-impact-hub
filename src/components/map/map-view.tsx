"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-slate-100" />,
});

export function MapView({ points, className, zoom }: { points: MapPoint[]; className?: string; zoom?: number }) {
  return <LeafletMap points={points} className={className} zoom={zoom} />;
}
