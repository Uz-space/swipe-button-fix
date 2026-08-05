import { useCallback, useEffect, useState } from "react";

export type Wallpaper = {
  /** 0–360 */
  hue: number;
  /** 0–100 — rang toʻyinganligi */
  saturation: number;
  /** 0–100 — yorugʻlik */
  brightness: number;
};

export const DEFAULT_WALLPAPER: Wallpaper = { hue: 275, saturation: 62, brightness: 26 };

const KEY = "webos.wallpaper.v1";

export function read(): Wallpaper {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WALLPAPER;
    const p = JSON.parse(raw) as Partial<Wallpaper>;
    return {
      hue: clamp(p.hue ?? DEFAULT_WALLPAPER.hue, 0, 360),
      saturation: clamp(p.saturation ?? DEFAULT_WALLPAPER.saturation, 0, 100),
      brightness: clamp(p.brightness ?? DEFAULT_WALLPAPER.brightness, 0, 100),
    };
  } catch {
    return DEFAULT_WALLPAPER;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

/** Bir tekis (yassi) rang — hech qanday gradient yoʻq. */
export function wallpaperCss(w: Wallpaper) {
  const c = round((w.saturation / 100) * 0.22);
  const l = round(0.08 + (w.brightness / 100) * 0.88);
  return `oklch(${l} ${c} ${round(w.hue)})`;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Fon yorqin boʻlsa matn qoraga oʻtadi. */
export function onWallpaperCss(w: Wallpaper) {
  return w.brightness > 62 ? "oklch(0.16 0.03 270)" : "oklch(0.99 0 0)";
}

export function useWallpaper() {
  const [wallpaper, setWallpaper] = useState<Wallpaper>(DEFAULT_WALLPAPER);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWallpaper(read());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Wallpaper>) => {
    setWallpaper((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setWallpaper(DEFAULT_WALLPAPER);
    try {
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_WALLPAPER));
    } catch {
      /* ignore */
    }
  }, []);

  return { wallpaper, ready, update, reset };
}
