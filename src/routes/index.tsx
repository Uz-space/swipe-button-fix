import { useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X, Pencil, Check, Palette } from "lucide-react";
import { useApps, type AppEntry } from "@/lib/apps-store";
import { AddAppSheet } from "@/components/os/AddAppSheet";
import { AppWindow, type OriginRect } from "@/components/os/AppWindow";
import { WallpaperSheet } from "@/components/os/WallpaperSheet";
import { onWallpaperCss, useWallpaper, wallpaperCss } from "@/lib/wallpaper-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WebOS — Saytlarni ilova kabi oching" },
      {
        name: "description",
        content:
          "iOS uslubidagi bosh ekran: saytlaringizni ilova ikonkalari sifatida qoʻshing, iframe ichida oching va yuqoriga surib yoping.",
      },
      { property: "og:title", content: "WebOS — Saytlarni ilova kabi oching" },
      {
        property: "og:description",
        content: "Cheksiz sayt qoʻshing, logo yuklang va iframe ichida ilova kabi ishlating.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function IconTile({
  app,
  editing,
  onOpen,
  onRemove,
}: {
  app: AppEntry;
  editing: boolean;
  onOpen: (rect: OriginRect) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`relative flex flex-col items-center gap-1.5 ${editing ? "os-jiggle" : ""}`}>
      <button
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onOpen({ x: r.x, y: r.y, width: r.width, height: r.height });
        }}
        className="grid size-[56px] place-items-center overflow-hidden rounded-[13px] os-glass shadow-os transition-transform active:scale-90"
        style={app.color && !app.icon ? { backgroundColor: app.color } : undefined}
      >
        {app.icon ? (
          <img src={app.icon} alt={`${app.name} logo`} className="size-full object-cover" />
        ) : (
          <span className="text-xl font-semibold text-os-on-wallpaper">
            {app.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>
      {editing && (
        <button
          aria-label={`${app.name} ni oʻchirish`}
          onClick={onRemove}
          className="absolute -left-1.5 -top-1.5 grid size-[22px] place-items-center rounded-full bg-[oklch(0.92_0_0)] text-[oklch(0.2_0_0)] shadow-os"
        >
          <X className="size-3.5" strokeWidth={3} />
        </button>
      )}
      <span className="w-[70px] truncate text-center text-[10.5px] leading-tight text-os-on-wallpaper drop-shadow">
        {app.name}
      </span>
    </div>
  );
}

function Home() {
  const { apps, ready, addApp, removeApp } = useApps();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState<AppEntry | null>(null);
  const [origin, setOrigin] = useState<OriginRect | null>(null);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const { wallpaper, update: updateWallpaper } = useWallpaper();
  const indicatorRef = useRef<HTMLDivElement>(null);

  return (
    <main
      className="h-[100dvh] overflow-hidden os-wallpaper text-os-on-wallpaper"
      style={
        {
          "--os-wallpaper": wallpaperCss(wallpaper),
          "--os-on-wallpaper": onWallpaperCss(wallpaper),
        } as CSSProperties
      }
    >
      <div className="mx-auto flex h-full max-w-md flex-col">
        <div
          className="flex-1 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)]"
          onClick={(e) => {
            if (editing && e.target === e.currentTarget) setEditing(false);
          }}
        >
          <div className="grid grid-cols-4 content-start gap-x-2 gap-y-5">
            {ready &&
              apps.map((app) => (
                <IconTile
                  key={app.id}
                  app={app}
                  editing={editing}
                  onOpen={(rect) => {
                    if (editing) return setEditing(false);
                    setOrigin(rect);
                    setActive(app);
                  }}
                  onRemove={() => removeApp(app.id)}
                />
              ))}
          </div>
        </div>

        {/* page dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          <span className="size-[6px] rounded-full bg-os-on-wallpaper" />
          <span className="size-[6px] rounded-full bg-os-on-wallpaper/35" />
        </div>

        {/* dock */}
        <div className="px-3 pb-1">
          <div className="flex items-center justify-center gap-4 rounded-[26px] os-glass px-4 py-3 shadow-os">
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Sayt qoʻshish"
              className="grid size-[52px] place-items-center rounded-[13px] bg-os-on-wallpaper/95 text-[oklch(0.2_0.05_270)] transition-transform active:scale-90"
            >
              <Plus className="size-6" />
            </button>
            <button
              onClick={() => setWallpaperOpen(true)}
              aria-label="Fon rangini oʻzgartirish"
              className="grid size-[52px] place-items-center rounded-[13px] os-glass text-os-on-wallpaper transition-transform active:scale-90"
            >
              <Palette className="size-5" />
            </button>
            <button
              onClick={() => setEditing((v) => !v)}
              aria-label={editing ? "Tahrirni tugatish" : "Tahrirlash"}
              className="grid size-[52px] place-items-center rounded-[13px] os-glass text-os-on-wallpaper transition-transform active:scale-90"
            >
              {editing ? <Check className="size-5" /> : <Pencil className="size-5" />}
            </button>
          </div>
        </div>

        {/* spacer for the fixed home indicator */}
        <div className="h-[calc(env(safe-area-inset-bottom)+1.5rem)]" />
      </div>

      {/* single home indicator — also the swipe-up-to-close gesture area */}
      <div
        ref={indicatorRef}
        className="fixed inset-x-0 bottom-0 z-[60] flex touch-none select-none items-end justify-center pb-[max(env(safe-area-inset-bottom),7px)]"
        style={{ height: "calc(30px + env(safe-area-inset-bottom))" }}
      >
        <div
          className={`h-[5px] w-[8.4rem] rounded-full will-change-transform ${
            active ? "bg-white/90" : "bg-os-on-wallpaper/70"
          }`}
        />
      </div>

      <AddAppSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={addApp} />
      {active && (
        <AppWindow
          key={active.id}
          app={active}
          origin={origin}
          gestureTargetRef={indicatorRef}
          onClose={() => setActive(null)}
        />
      )}
      <WallpaperSheet
        open={wallpaperOpen}
        wallpaper={wallpaper}
        onChange={updateWallpaper}
        onClose={() => setWallpaperOpen(false)}
      />
    </main>
  );
}
