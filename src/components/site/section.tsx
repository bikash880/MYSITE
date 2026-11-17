import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

/** Renders *starred* words as gradient serif-italic accents (server-safe). */
export function RichTitle({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span key={i} className="accent-serif text-gradient">
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-accent" aria-hidden />
      {children}
    </p>
  );
}

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("container-page py-20 sm:py-28", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Tag = "h2",
  action,
}: {
  eyebrow?: string;
  /** Wrap words in *asterisks* for a serif-italic gradient accent. */
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  action?: React.ReactNode;
}) {
  return (
    <Reveal
      className={cn(
        "mb-12 flex flex-col gap-6 sm:mb-16",
        align === "center" ? "mx-auto max-w-2xl items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn(align === "center" && "flex flex-col items-center")}>
        {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
        <Tag className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          <RichTitle text={title} />
        </Tag>
        {description && (
          <p className={cn("mt-5 max-w-xl text-base text-muted-foreground sm:text-lg", align === "center" && "mx-auto")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}

/** Large page header used at the top of inner pages. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="container-page relative pt-16 pb-12 sm:pt-24 sm:pb-16">
      <Reveal>
        {eyebrow && <Eyebrow className="mb-6">{eyebrow}</Eyebrow>}
        <h1 className="max-w-4xl text-5xl font-semibold leading-[1] tracking-tight sm:text-6xl lg:text-7xl">
          <RichTitle text={title} />
        </h1>
        {description && <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">{description}</p>}
        {children}
      </Reveal>
    </header>
  );
}
