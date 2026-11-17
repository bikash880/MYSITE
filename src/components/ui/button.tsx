import { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  // Brand gradient with a soft glow and a light sheen that sweeps across on hover.
  primary: cn(
    "relative overflow-hidden text-white",
    "bg-[linear-gradient(135deg,var(--brand),color-mix(in_oklab,var(--brand)_70%,var(--brand-2)))]",
    "shadow-[0_8px_30px_-8px_color-mix(in_oklab,var(--brand)_70%,transparent),inset_0_1px_0_rgb(255_255_255/0.25)]",
    "hover:shadow-[0_12px_40px_-8px_color-mix(in_oklab,var(--brand)_85%,transparent),inset_0_1px_0_rgb(255_255_255/0.3)]",
    "before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(110deg,transparent_30%,rgb(255_255_255/0.28)_50%,transparent_70%)]",
    "before:transition-transform before:duration-700 hover:before:translate-x-full",
  ),
  secondary: "bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--muted)_70%,var(--foreground)_8%)]",
  outline:
    "border border-border bg-card/40 text-foreground backdrop-blur hover:border-[color-mix(in_oklab,var(--brand)_45%,var(--border))] hover:bg-card",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  danger: "bg-red-600 text-white shadow-[0_8px_24px_-8px_rgb(220_38_38/0.6)] hover:bg-red-500",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-[15px] gap-2.5",
  icon: "h-10 w-10",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "group/btn inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-medium tracking-tight",
    "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading && <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  external,
  ...props
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const cls = buttonVariants({ variant, size, className });
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...props}>
      {children}
    </Link>
  );
}

/** Arrow that nudges right when its parent button/link is hovered. */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("relative h-4 w-4", className)} aria-hidden>
      <path
        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover:translate-x-0.5"
      />
    </svg>
  );
}
