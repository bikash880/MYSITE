"use client";

import { useState } from "react";
import { Crosshair, ExternalLink, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "done"; lat: number; lon: number; accuracy: number }
  | { kind: "error"; message: string };

/** Turns coordinates into "City, State, Country" (free, key-less reverse geocoder). */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const d = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string };
  const parts = [d.city || d.locality, d.principalSubdivision, d.countryName]
    .map((p) => p?.trim())
    .filter((p, i, all): p is string => Boolean(p) && all.indexOf(p) === i);
  return parts.length ? parts.join(", ") : null;
}

function geoErrorMessage(err: GeolocationPositionError) {
  if (err.code === err.PERMISSION_DENIED) return "Location permission was denied. Allow it in your browser's site settings and try again.";
  if (err.code === err.POSITION_UNAVAILABLE) return "Your position isn't available right now. Check that location services are on.";
  if (err.code === err.TIMEOUT) return "Finding your location took too long. Try again.";
  return "Couldn't get your location.";
}

/**
 * Text input for a location plus a "Use current location" button that captures the device's
 * position (browser geolocation, asks for permission) and fills in the place name.
 * Coordinates are only shown here — only the place name text is saved.
 */
export function LocationField({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  describedBy?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function capture() {
    if (!("geolocation" in navigator)) {
      setStatus({ kind: "error", message: "This browser can't share its location." });
      return;
    }
    if (!window.isSecureContext) {
      setStatus({ kind: "error", message: "Location only works over HTTPS (or on localhost)." });
      return;
    }
    setStatus({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lon = Number(pos.coords.longitude.toFixed(5));
        let name: string | null = null;
        try {
          name = await reverseGeocode(lat, lon);
        } catch {
          name = null;
        }
        onChange((name ?? `${lat}, ${lon}`).slice(0, 100));
        setStatus({ kind: "done", lat, lon, accuracy: Math.round(pos.coords.accuracy) });
      },
      (err) => setStatus({ kind: "error", message: geoErrorMessage(err) }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  const locating = status.kind === "locating";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            value={value}
            placeholder={placeholder ?? "City, Country"}
            onChange={(e) => onChange(e.target.value)}
            invalid={invalid}
            aria-describedby={describedBy}
            className="pl-10"
          />
        </div>
        <button
          type="button"
          onClick={capture}
          disabled={locating}
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-medium text-primary transition",
            "hover:bg-primary hover:text-white disabled:cursor-wait disabled:opacity-70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          )}
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {locating ? "Locating…" : "Use current location"}
        </button>
      </div>

      {status.kind === "done" && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground" role="status">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Location captured
          </span>
          <span className="font-mono">
            {status.lat}, {status.lon}
          </span>
          <span>(±{status.accuracy} m)</span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${status.lat}&mlon=${status.lon}#map=13/${status.lat}/${status.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            View on map <ExternalLink className="h-3 w-3" />
          </a>
          <span className="basis-full">Edit the text if you&apos;d like to show something broader, then save. Only the text is saved.</span>
        </p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {status.message}
        </p>
      )}
    </div>
  );
}
