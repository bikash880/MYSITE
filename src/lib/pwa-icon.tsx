import { ImageResponse } from "next/og";

/** Renders the app icon (a monogram on the brand colour) at any size. */
export function renderIcon(size: number, text: string, brand: string, opts: { maskable?: boolean } = {}) {
  const radius = opts.maskable ? 0 : Math.round(size * 0.22);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${brand}, #1a1830)`,
          borderRadius: radius,
          color: "white",
          fontSize: Math.round(size * (opts.maskable ? 0.34 : 0.44)),
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        {text}
      </div>
    ),
    { width: size, height: size },
  );
}
