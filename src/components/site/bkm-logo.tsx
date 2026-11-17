import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Animated "BKM" monogram — Bikash Kumar Mahato.
 * The letters are single-stroke paths that draw themselves in, filled with a slowly flowing
 * violet → cyan → pink gradient, inside a glass tile with a rotating gradient halo and a shine sweep.
 * `animated={false}` renders the finished mark (e.g. for small header use).
 */
export function BkmLogo({ size = 112, animated = true, className }: { size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const flow = `bkm-flow-${id}`;
  const edge = `bkm-edge-${id}`;
  const clip = `bkm-clip-${id}`;
  return (
    <span
      className={cn("bkm-logo relative inline-grid shrink-0 place-items-center", animated && "bkm-animated", className)}
      style={{ width: size, height: size }}
    >
      {/* rotating gradient halo */}
      {animated && (
        <span aria-hidden className="bkm-halo absolute inset-[-14%] rounded-[34%] opacity-70 blur-xl" />
      )}
      <svg viewBox="0 0 120 120" className="relative h-full w-full overflow-visible" role="img" aria-label="BKM — Bikash Kumar Mahato">
        <defs>
          <linearGradient id={flow} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset=".35" stopColor="#6366f1" />
            <stop offset=".62" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#f0abfc" />
            {animated && (
              <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="9s" repeatCount="indefinite" />
            )}
          </linearGradient>
          <linearGradient id={edge} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c4b5fd" stopOpacity=".9" />
            <stop offset=".5" stopColor="#67e8f9" stopOpacity=".25" />
            <stop offset="1" stopColor="#f0abfc" stopOpacity=".9" />
            {animated && (
              <animateTransform attributeName="gradientTransform" type="rotate" values="360 .5 .5;0 .5 .5" dur="7s" repeatCount="indefinite" />
            )}
          </linearGradient>
          <clipPath id={clip}>
            <rect x="2" y="2" width="116" height="116" rx="34" />
          </clipPath>
        </defs>

        {/* glass tile */}
        <rect x="2" y="2" width="116" height="116" rx="34" fill="#0c0c13" />
        <rect x="2" y="2" width="116" height="116" rx="34" fill={`url(#${flow})`} opacity=".08" />
        <g clipPath={`url(#${clip})`}>
          <circle cx="30" cy="22" r="46" fill="#8b5cf6" opacity=".16" />
          <circle cx="98" cy="104" r="40" fill="#22d3ee" opacity=".1" />
          {animated && <rect className="bkm-shine" x="-60" y="-20" width="34" height="170" fill="#fff" opacity=".09" transform="rotate(24 60 60)" />}
        </g>
        <rect x="2.75" y="2.75" width="114.5" height="114.5" rx="33.25" fill="none" stroke={`url(#${edge})`} strokeWidth="1.5" />

        {/* B · K · M */}
        <g
          transform="translate(15 37) scale(1.25)"
          fill="none"
          stroke={`url(#${flow})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="bkm-letters"
        >
          <path pathLength={1} d="M10 8V32M10 8H17A6 6 0 0 1 17 20H10M10 20H18A6 6 0 0 1 18 32H10" />
          <path pathLength={1} d="M31 8V32M43 8L31 21M35 17L44 32" />
          <path pathLength={1} d="M52 32V8L58.5 20L65 8V32" />
        </g>
        {/* accent spark */}
        <circle className="bkm-spark" cx="96" cy="30" r="2.6" fill="#f0abfc" />
      </svg>
    </span>
  );
}
