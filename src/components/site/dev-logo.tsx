import { cn } from "@/lib/utils";

/**
 * Brand mark: an animated laptop inside a rounded badge with a purple → blue gradient border and
 * a soft glow. On load the lid swings open; then code lines keep "typing" across the screen with a
 * blinking cursor. Stays dark in both themes.
 */
export function DevLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "dev-logo relative inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-xl p-px",
        "bg-[linear-gradient(135deg,#c4b5fd_0%,#8b5cf6_35%,#6366f1_65%,#3b82f6_100%)]",
        "shadow-[0_0_20px_-6px_rgba(124,92,255,.85),0_6px_16px_-8px_rgba(59,130,246,.6)]",
        "transition-[box-shadow,transform] duration-500 group-hover:-translate-y-px group-hover:shadow-[0_0_28px_-4px_rgba(124,92,255,.95),0_8px_22px_-8px_rgba(59,130,246,.75)]",
        className,
      )}
    >
      <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-[11px] bg-[#0b0b14]">
        {/* inner light */}
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(139,92,246,.38),transparent_58%),radial-gradient(90%_90%_at_100%_100%,rgba(59,130,246,.28),transparent_60%)]" />
        <svg viewBox="0 0 32 24" className="relative h-[22px] w-[29px] overflow-visible">
          <defs>
            <linearGradient id="dev-laptop-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c4b5fd" />
              <stop offset=".5" stopColor="#818cf8" />
              <stop offset="1" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="dev-screen-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4c1d95" stopOpacity=".55" />
              <stop offset="1" stopColor="#1e3a8a" stopOpacity=".35" />
            </linearGradient>
          </defs>

          {/* lid: swings open on load */}
          <g className="dev-lid">
            <rect x="5" y="2.5" width="22" height="15" rx="2" fill="url(#dev-screen-g)" stroke="url(#dev-laptop-g)" strokeWidth="1.6" />
            <rect className="dev-screen-glow" x="6.6" y="4.1" width="18.8" height="11.8" rx="1" fill="#818cf8" opacity=".14" />
            {/* code lines typing */}
            <g strokeLinecap="round" strokeWidth="1.5">
              <line className="dev-code dev-code-1" x1="8.6" y1="7" x2="17" y2="7" stroke="#c4b5fd" />
              <line className="dev-code dev-code-2" x1="10.6" y1="10" x2="21.5" y2="10" stroke="#93c5fd" />
              <line className="dev-code dev-code-3" x1="8.6" y1="13" x2="14.2" y2="13" stroke="#a5b4fc" />
            </g>
            <rect className="dev-caret" x="15.4" y="11.9" width="1.5" height="2.3" rx=".5" fill="#38bdf8" />
          </g>

          {/* base / keyboard deck */}
          <path d="M2 19.2h28l-1.6 2.3a1.6 1.6 0 0 1-1.3.7H4.9a1.6 1.6 0 0 1-1.3-.7Z" fill="url(#dev-laptop-g)" />
          <rect x="13.5" y="19.2" width="5" height="1" rx=".5" fill="#0b0b14" opacity=".55" />
        </svg>
      </span>
    </span>
  );
}
