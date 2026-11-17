/** @type {import('tailwindcss').Config} */
// Colours are CSS variables (space-separated RGB) set at runtime by ThemeProvider,
// so light/dark mode and the admin-chosen brand colour apply everywhere.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: v("brand"),
        background: v("background"),
        foreground: v("foreground"),
        card: v("card"),
        muted: v("muted"),
        "muted-foreground": v("muted-foreground"),
        border: v("border"),
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
      },
    },
  },
  plugins: [],
};
