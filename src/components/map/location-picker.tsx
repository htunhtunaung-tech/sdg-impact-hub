"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-[12px] bg-slate-100" />,
});

/** Search an address (OpenStreetMap Nominatim) or click the map to set coordinates. */
export function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number | null; lng: number | null };
  onChange: (v: { lat: number; lng: number; city?: string; country?: string; name?: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const search = async () => {
    if (q.trim().length < 3) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
      });
      const data = (await res.json()) as { lat: string; lon: string; display_name: string; address?: Record<string, string> }[];
      if (!data[0]) return setMsg("No match found. Try a nearby town, or click the map.");
      const a = data[0].address ?? {};
      onChange({
        lat: +(+data[0].lat).toFixed(5),
        lng: +(+data[0].lon).toFixed(5),
        city: a.city ?? a.town ?? a.village ?? a.state,
        country: a.country,
        name: data[0].display_name.split(",").slice(0, 2).join(",").trim(),
      });
    } catch {
      setMsg("Address search is unavailable right now — click the map instead.");
    } finally {
      setBusy(false);
    }
  };

  const useMine = () => {
    if (!navigator.geolocation) return setMsg("Your browser doesn't share location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }),
      () => setMsg("Couldn't get your location."),
    );
  };

  const picked = value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : null;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="Search an address or place"
          aria-label="Search an address"
        />
        <Button type="button" variant="secondary" onClick={search} loading={busy}>
          <Search /> Find
        </Button>
        <Button type="button" variant="secondary" size="icon" onClick={useMine} aria-label="Use my location">
          <LocateFixed />
        </Button>
      </div>
      <LeafletMap points={[]} picked={picked} onPick={onChange} zoom={picked ? 13 : 6} className="h-64 overflow-hidden rounded-[12px] border border-border" />
      <p className="text-xs text-ink-subtle">
        {msg ?? (picked ? `Pinned at ${picked.lat}, ${picked.lng}. Click the map to adjust.` : "Click the map to drop a pin.")}
      </p>
    </div>
  );
}
