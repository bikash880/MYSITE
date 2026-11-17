import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSettings } from "@/hooks/use-public-data";
import { DEFAULT_BRAND, themeColors, themeVars, type Scheme, type ThemeColors } from "@/lib/theme";

export type ThemePref = "system" | "light" | "dark";
const KEY = "theme:pref";

type ThemeCtx = {
  scheme: Scheme;
  colors: ThemeColors;
  pref: ThemePref;
  ready: boolean;
  setPref: (p: ThemePref) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [ready, setReady] = useState(false);
  const { data: settings } = useSettings();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v === "light" || v === "dark" || v === "system" ? setPrefState(v) : undefined)
      .finally(() => setReady(true));
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  }, []);

  const scheme: Scheme = pref === "system" ? (system === "light" ? "light" : "dark") : pref;
  const brand = settings?.theme_color ?? DEFAULT_BRAND;
  const colors = useMemo(() => themeColors(scheme, brand), [scheme, brand]);
  const style = useMemo(() => [{ flex: 1, backgroundColor: colors.background }, themeVars(colors)], [colors]);

  const value = useMemo<ThemeCtx>(
    () => ({ scheme, colors, pref, ready, setPref, toggle: () => setPref(scheme === "dark" ? "light" : "dark") }),
    [scheme, colors, pref, ready, setPref],
  );

  return (
    <Ctx.Provider value={value}>
      <View style={style}>{children}</View>
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
