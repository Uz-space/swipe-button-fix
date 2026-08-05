import { type Wallpaper } from "@/lib/wallpaper-store";

function Slider({
  value,
  min,
  max,
  track,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  track: string;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="os-range"
      style={{ backgroundImage: track }}
    />
  );
}

export function WallpaperSheet({
  open,
  wallpaper,
  onChange,
  onClose,
}: {
  open: boolean;
  wallpaper: Wallpaper;
  onChange: (patch: Partial<Wallpaper>) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const hueTrack = `linear-gradient(90deg, ${Array.from(
    { length: 13 },
    (_, i) => `hsl(${i * 30} 100% 50%)`,
  ).join(", ")})`;
  const satTrack = `linear-gradient(90deg, hsl(${wallpaper.hue} 0% 55%), hsl(${wallpaper.hue} 100% 50%))`;
  const briTrack = `linear-gradient(90deg, hsl(${wallpaper.hue} 90% 4%), hsl(${wallpaper.hue} 100% 50%), hsl(${wallpaper.hue} 100% 96%))`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Yopish" onClick={onClose} className="absolute inset-0" />
      <div className="relative mb-3 w-full max-w-md rounded-[1.6rem] os-sheet mx-3 px-3 pb-3 pt-3 text-os-on-wallpaper shadow-2xl">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 space-y-2">
            <Slider
              value={wallpaper.hue}
              min={0}
              max={360}
              track={hueTrack}
              onChange={(hue) => onChange({ hue })}
            />
            <Slider
              value={wallpaper.saturation}
              min={0}
              max={100}
              track={satTrack}
              onChange={(saturation) => onChange({ saturation })}
            />
            <Slider
              value={wallpaper.brightness}
              min={0}
              max={100}
              track={briTrack}
              onChange={(brightness) => onChange({ brightness })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
