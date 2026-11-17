import sanitizeHtml from "sanitize-html";
import { cn } from "@/lib/utils";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "figure",
    "figcaption",
    "s",
    "u",
    "mark",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    code: ["class"],
    pre: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
  },
};

/** Renders admin-authored HTML after sanitising it (defence in depth). */
export function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-14 prose-h2:text-3xl prose-h3:text-2xl",
        "prose-p:leading-[1.8] prose-p:text-foreground/85 prose-li:text-foreground/85 prose-strong:text-foreground",
        "prose-a:font-medium prose-a:text-primary prose-a:decoration-primary/30 prose-a:underline-offset-4 hover:prose-a:decoration-primary",
        "prose-blockquote:border-l-primary prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-foreground/80",
        "prose-img:rounded-3xl prose-img:border prose-img:border-border prose-img:shadow-soft",
        "prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-card prose-pre:text-foreground",
        "prose-code:rounded-md prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
        "prose-hr:border-border",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html, OPTIONS) }}
    />
  );
}
