import { useCallback, useEffect, useState } from "react";

export type AppEntry = {
  id: string;
  name: string;
  url: string;
  icon?: string; // data URL
  color?: string;
};

const KEY = "webos.apps.v1";

const DEFAULTS: AppEntry[] = [
  { id: "wiki", name: "Wikipedia", url: "https://uz.wikipedia.org", color: "hsl(220 8% 30%)" },
  { id: "bing", name: "Bing", url: "https://www.bing.com", color: "hsl(190 80% 40%)" },
  { id: "ddg", name: "Search", url: "https://duckduckgo.com", color: "hsl(20 90% 55%)" },
];

function read(): AppEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppEntry[]) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useApps() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setApps(read());
    setReady(true);
  }, []);

  const persist = useCallback((next: AppEntry[]) => {
    setApps(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
  }, []);

  const addApp = useCallback(
    (app: Omit<AppEntry, "id">) => {
      persist([...read(), { ...app, id: crypto.randomUUID() }]);
    },
    [persist],
  );

  const removeApp = useCallback(
    (id: string) => {
      persist(read().filter((a) => a.id !== id));
    },
    [persist],
  );

  return { apps, ready, addApp, removeApp };
}

export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
