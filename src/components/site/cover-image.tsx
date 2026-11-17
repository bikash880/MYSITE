import Image from "next/image";
import { cn, isExternalImage } from "@/lib/utils";

/** next/image with an elegant branded placeholder when no image is set. */
export function CoverImage({
  src,
  alt,
  sizes,
  priority,
  className,
  label,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Text shown on the placeholder (e.g. the project title). */
  label?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" unoptimized={isExternalImage(src)} />
      ) : (
        <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--brand)_40%,transparent),transparent_55%),radial-gradient(circle_at_90%_100%,color-mix(in_oklab,var(--brand-2)_30%,transparent),transparent_50%)]">
          <div aria-hidden className="bg-grid absolute inset-0 opacity-60" />
          {label ? (
            <span className="accent-serif relative px-6 text-center text-3xl leading-tight text-foreground/80 sm:text-4xl">{label}</span>
          ) : (
            <span aria-hidden className="relative h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent opacity-80 blur-[1px]" />
          )}
        </div>
      )}
    </div>
  );
}
