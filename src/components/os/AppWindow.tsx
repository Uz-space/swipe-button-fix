import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppEntry } from "@/lib/apps-store";

export type OriginRect = { x: number; y: number; width: number; height: number };

type Props = {
  app: AppEntry;
  origin?: OriginRect | null;
  onClose: () => void;
  /** Home-screen indicator that drives the swipe-up-to-close gesture. */
  gestureTargetRef?: React.RefObject<HTMLElement | null>;
};

/* iOS spring-ish easing used by SpringBoard for app open/close. */
const SPRING = "cubic-bezier(.32,.72,0,1)";
const OPEN_MS = 420;
const CLOSE_MS = 360;
const ICON_RADIUS = 13;

type Pose = { x: number; y: number; s: number; r: number; o: number };

const FULL: Pose = { x: 0, y: 0, s: 1, r: 0, o: 1 };

function poseFromRect(rect: OriginRect | null | undefined): Pose {
  const vw = typeof window === "undefined" ? 390 : window.innerWidth;
  const vh = typeof window === "undefined" ? 844 : window.innerHeight;
  if (!rect) return { x: 0, y: 0, s: 0.86, r: 30, o: 0 };
  const s = Math.max(rect.width / vw, 0.05);
  // translate the (scaled, centre-origin) card so its box lands on the icon
  const x = rect.x + rect.width / 2 - vw / 2;
  const y = rect.y + rect.height / 2 - vh / 2;
  return { x, y, s, r: ICON_RADIUS / s, o: 0 };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function AppWindow({ app, origin, onClose, gestureTargetRef }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);
  const [mounted, setMounted] = useState(false);

  const closed = useRef(false);
  const frame = useRef<number | null>(null);
  /** value currently painted — rAF eases toward `target` for silky tracking */
  const shown = useRef<Pose>({ ...FULL });
  const target = useRef<Pose>({ ...FULL });
  const g = useRef({ active: false, id: -1, startX: 0, startY: 0, lastY: 0, lastT: 0, v: 0, dy: 0 });

  useEffect(() => setMounted(true), []);

  const apply = (p: Pose) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) scale(${p.s})`;
    card.style.borderRadius = `${p.r}px`;
    card.style.opacity = `${p.o}`;
    const scrim = scrimRef.current;
    if (scrim) scrim.style.opacity = `${Math.min(1, (p.s - 0.6) / 0.4)}`;
  };

  /** frame loop: exponential smoothing toward the finger position */
  const tick = () => {
    frame.current = null;
    const s = shown.current;
    const t = target.current;
    const k = 0.28; // follow stiffness — high enough to feel 1:1, smooth enough to filter jitter
    s.x = lerp(s.x, t.x, k);
    s.y = lerp(s.y, t.y, k);
    s.s = lerp(s.s, t.s, k);
    s.r = lerp(s.r, t.r, k);
    s.o = lerp(s.o, t.o, k);
    apply(s);
    if (g.current.active) frame.current = requestAnimationFrame(tick);
  };

  const schedule = () => {
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  };

  // Open: zoom out of the tapped icon.
  useLayoutEffect(() => {
    if (!mounted) return;
    const card = cardRef.current;
    if (!card) return;
    const from = poseFromRect(origin);
    shown.current = { ...from };
    target.current = { ...FULL };
    card.style.transition = "none";
    apply(from);
    void card.offsetWidth;
    const id = requestAnimationFrame(() => {
      card.style.transition = `transform ${OPEN_MS}ms ${SPRING}, border-radius ${OPEN_MS}ms ${SPRING}, opacity 200ms ease-out`;
      if (scrimRef.current) scrimRef.current.style.transition = `opacity ${OPEN_MS}ms ease-out`;
      shown.current = { ...FULL };
      apply(FULL);
    });
    const t = window.setTimeout(() => setInteractive(true), OPEN_MS);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, [mounted, origin]);

  useEffect(() => () => void (frame.current && cancelAnimationFrame(frame.current)), []);

  const animateClose = (velocity = 0) => {
    if (closed.current) return;
    closed.current = true;
    const card = cardRef.current;
    if (!card) return onClose();
    const to = poseFromRect(origin);
    // faster flick -> shorter, snappier flight (iOS scales duration with velocity)
    const ms = Math.max(220, Math.min(CLOSE_MS, CLOSE_MS - velocity * 180));
    card.style.transition = `transform ${ms}ms ${SPRING}, border-radius ${ms}ms ${SPRING}, opacity ${ms * 0.85}ms ease-out`;
    if (scrimRef.current) scrimRef.current.style.transition = `opacity ${ms}ms ease-out`;
    apply(to);
    window.setTimeout(onClose, ms);
  };

  const settleBack = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = `transform ${OPEN_MS}ms ${SPRING}, border-radius ${OPEN_MS}ms ${SPRING}, opacity 200ms ease-out`;
    if (scrimRef.current) scrimRef.current.style.transition = `opacity ${OPEN_MS}ms ease-out`;
    shown.current = { ...FULL };
    target.current = { ...FULL };
    apply(FULL);
  };

  // Bind the gesture to the single home indicator (the app has no bar of its own).
  useEffect(() => {
    const el = gestureTargetRef?.current;
    if (!el) return;

    const down = (e: PointerEvent) => {
      if (!interactive || closed.current) return;
      const card = cardRef.current;
      if (!card) return;
      card.style.transition = "none";
      if (scrimRef.current) scrimRef.current.style.transition = "none";
      g.current = {
        active: true,
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastY: e.clientY,
        lastT: e.timeStamp,
        v: 0,
        dy: 0,
      };
      el.setPointerCapture?.(e.pointerId);
      schedule();
    };

    const move = (e: PointerEvent) => {
      const s = g.current;
      if (!s.active || s.id !== e.pointerId || closed.current) return;
      e.preventDefault();
      const dt = Math.max(8, e.timeStamp - s.lastT);
      const instV = (s.lastY - e.clientY) / dt; // px/ms, up positive
      s.v = s.v * 0.7 + instV * 0.3; // smoothed velocity, like UIKit's decay
      s.lastY = e.clientY;
      s.lastT = e.timeStamp;
      s.dy = s.startY - e.clientY;

      const vh = window.innerHeight;
      const up = Math.max(0, s.dy);
      // rubber band: the further you pull, the less it moves
      const pulled = vh * 0.42 * (1 - Math.exp(-up / (vh * 0.42)));
      const progress = Math.min(1, pulled / (vh * 0.42));
      const to = poseFromRect(origin);
      target.current = {
        x: (e.clientX - s.startX) * 0.35 * progress + to.x * progress * 0.35,
        y: -pulled * 0.55,
        s: lerp(1, Math.max(to.s, 0.28), progress * 0.85),
        r: lerp(0, 34, Math.min(1, progress * 2)),
        o: 1,
      };
      schedule();
    };

    const up = (e: PointerEvent) => {
      const s = g.current;
      if (!s.active || (e.pointerId !== undefined && s.id !== e.pointerId && e.type !== "lostpointercapture"))
        return;
      s.active = false;
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      // project where the finger would land (iOS uses velocity projection)
      const projected = s.dy + s.v * 130;
      if (s.v > 0.25 || projected > 90) animateClose(s.v);
      else settleBack();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move, { passive: false });
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
    };
  }, [gestureTargetRef, interactive, origin]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed left-0 top-0 z-50 w-screen overflow-hidden" style={{ height: "100dvh" }}>
      <div ref={scrimRef} className="absolute inset-0 bg-[oklch(0_0_0/0.35)] opacity-0" />

      <div
        ref={cardRef}
        className="absolute inset-0 overflow-hidden bg-black will-change-transform"
        style={{
          transformOrigin: "center center",
          backfaceVisibility: "hidden",
          contain: "paint",
        }}
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
    </div>,
    document.body,
  );
}
