import type { ThemeColors } from "./theme";

/** Removes scripts, inline handlers and javascript: URLs (content is admin-authored, but be safe). */
export function sanitize(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=$2#$2");
}

/** Wraps rich text in a themed HTML document for the WebView renderer. */
export function htmlDocument(body: string, c: ThemeColors) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 17px; line-height: 1.7;
         color: ${c.foreground}; word-wrap: break-word; -webkit-text-size-adjust: 100%; }
  h1, h2, h3, h4 { line-height: 1.3; margin: 1.4em 0 0.5em; font-weight: 700; }
  h2 { font-size: 1.4em; } h3 { font-size: 1.2em; }
  p { margin: 0 0 1em; }
  a { color: ${c.primary}; }
  img { max-width: 100%; height: auto; border-radius: 14px; }
  blockquote { margin: 1em 0; padding: 0.2em 1em; border-left: 3px solid ${c.primary}; color: ${c.mutedForeground}; }
  pre { background: ${c.muted}; padding: 14px; border-radius: 12px; overflow-x: auto; font-size: 14px; }
  code { background: ${c.muted}; padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 1px solid ${c.border}; margin: 2em 0; }
  ul, ol { padding-left: 1.3em; }
  body > *:first-child { margin-top: 0; }
</style></head><body>${sanitize(body)}</body></html>`;
}

/** Posts the document height to React Native so the WebView can size itself. */
export const HEIGHT_SCRIPT = `
(function () {
  function send() { window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight)); }
  new ResizeObserver(send).observe(document.body);
  window.addEventListener('load', send);
  Array.prototype.forEach.call(document.images, function (img) { img.addEventListener('load', send); });
  send();
})();
true;`;
