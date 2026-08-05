import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppEntry } from "@/lib/apps-store";

export type OriginRect = { x: number; y: number; width: number; height: number };

type Props = {
  app: AppEntry;
  origin?: OriginRect | null;
  onClose: () => void;
};

const BAR = 30; // gesture area height (px)
const SPRING = "cubic-bezier(.32,.72,0,1)";
const OPEN_MS = 380;
const CLOSE_MS = 340;

// iOS-style: the window zooms out toward the centre of the screen.
const MINI = "scale(0.86)";
const FULL = "scale(1)";

export function AppWindow({ app, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);
  const [mounted, setMounted] = useState(false);

  const gesture = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
    dx: 0,
    dy: 0,
  });
  const closed = useRef(false);
  const frame = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  // Open animation: zoom in from the centre.
  useLayoutEffect(() => {
    if (!mounted) return;
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "none";
    card.style.transform = MINI;
    card.style.borderRadius = "30px";
    card.style.opacity = "0";
    // force style flush so the transition always runs from the mini state
    void card.offsetWidth;
    const id = requestAnimationFrame(() => {
      card.style.transition = `transform ${OPEN_MS}ms ${SPRING}, border-radius ${OPEN_MS}ms ${SPRING}, opacity 180ms ease-out`;
      card.style.transform = FULL;
      card.style.borderRadius = "0px";
      card.style.opacity = "1";
      if (scrimRef.current) scrimRef.current.style.opacity = "1";
    });
    const t = window.setTimeout(() => setInteractive(true), OPEN_MS);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, [mounted]);

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const animateClose = () => {
    if (closed.current) return;
    closed.current = true;
    const card = cardRef.current;
    if (!card) return onClose();
    card.style.transition = `transform ${CLOSE_MS}ms ${SPRING}, border-radius ${CLOSE_MS}ms ${SPRING}, opacity ${CLOSE_MS}ms ease-out`;
    card.style.transform = MINI;
    card.style.borderRadius = "30px";
    card.style.opacity = "0";
    if (scrimRef.current) {
      scrimRef.current.style.transition = `opacity ${CLOSE_MS}ms ease`;
      scrimRef.current.style.opacity = "0";
    }
    window.setTimeout(onClose, CLOSE_MS);
  };

  const settleBack = () => {
    const card = cardRef.current;
    if (card) {
      card.style.transition = `transform ${OPEN_MS}ms ${SPRING}, border-radius ${OPEN_MS}ms ${SPRING}`;
      card.style.transform = FULL;
      card.style.borderRadius = "0px";
    }
    const ind = indicatorRef.current;
    if (ind) {
      ind.style.transition = `transform ${OPEN_MS}ms ${SPRING}`;
      ind.style.transform = "scaleX(1)";
    }
  };

  const paint = () => {
    frame.current = null;
    const card = cardRef.current;
    if (!card || closed.current) return;
    const { dy } = gesture.current;
    const up = Math.max(0, dy);
    const progress = Math.min(1, up / 320);
    // Pure centred zoom-out — no horizontal wobble.
    const scale = 1 - progress * 0.16;
    card.style.transition = "none";
    card.style.transform = `scale(${scale})`;
    card.style.borderRadius = `${progress * 30}px`;
    const ind = indicatorRef.current;
    if (ind) {
      ind.style.transition = "none";
      ind.style.transform = `scaleX(${1 - progress * 0.25})`;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || closed.current) return;
    const g = gesture.current;
    g.active = true;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.lastY = e.clientY;
    g.lastT = performance.now();
    g.velocity = 0;
    g.dx = 0;
    g.dy = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.active || closed.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - g.lastT);
    g.velocity = (g.lastY - e.clientY) / dt; // px per ms, upward positive
    g.lastY = e.clientY;
    g.lastT = now;
    g.dx = e.clientX - g.startX;
    g.dy = g.startY - e.clientY;
    if (frame.current === null) frame.current = requestAnimationFrame(paint);
  };

  const onPointerUp = () => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    const flicked = g.velocity > 0.4;
    const far = g.dy > 100;
    g.dx = 0;
    g.dy = 0;
    if (flicked || far) animateClose();
    else settleBack();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed left-0 top-0 z-50 w-screen overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <div
        ref={scrimRef}
        className="absolute inset-0 bg-[oklch(0_0_0/0.35)] opacity-0 transition-opacity duration-300"
      />

      <div
        ref={cardRef}
        className="absolute inset-0 overflow-hidden bg-black will-change-transform"
        style={{ transformOrigin: "center center", backfaceVisibility: "hidden" }}
      >
        <iframe
          src={app.url}
          title={app.name}
          className="size-full border-0"
          style={{ pointerEvents: interactive ? "auto" : "none" }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* home-indicator gesture area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Yopish uchun yuqoriga suring"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") animateClose();
        }}
        className="absolute inset-x-0 bottom-0 z-10 flex touch-none select-none items-end justify-center bg-gradient-to-t from-black/55 to-transparent pb-[max(env(safe-area-inset-bottom),7px)]"
        style={{ height: `calc(${BAR}px + env(safe-area-inset-bottom))` }}
      >
        <div
          ref={indicatorRef}
          className="h-[5px] w-[8.4rem] rounded-full bg-white/90 will-change-transform"
        />
      </div>
    </div>,
    document.body,
  );
}
