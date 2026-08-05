import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { normalizeUrl, type AppEntry } from "@/lib/apps-store";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (app: Omit<AppEntry, "id">) => void;
};

async function fileToIcon(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml") return dataUrl;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      const ratio = Math.max(size / img.width, size / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL("image/png", 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function AddAppSheet({ open, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState<string | undefined>();
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setName("");
    setUrl("");
    setIcon(undefined);
    setError("");
  };

  const submit = () => {
    const finalUrl = normalizeUrl(url);
    if (!name.trim() || !finalUrl) {
      setError("Nom va havolani kiriting");
      return;
    }
    onAdd({ name: name.trim(), url: finalUrl, ...(icon ? { icon } : {}) });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Yopish"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-t-[2rem] os-sheet px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4 text-os-on-wallpaper shadow-os">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-os-on-wallpaper/30" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Yangi ilova</h2>
          <button
            aria-label="Bekor qilish"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full os-glass"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="grid size-[68px] shrink-0 place-items-center overflow-hidden rounded-icon os-glass"
          >
            {icon ? (
              <img src={icon} alt="Logo" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 opacity-70" />
            )}
          </button>
          <div className="text-xs opacity-70">
            Logo yuklang (PNG, JPG, SVG). Tanlanmasa nom bosh harfi ishlatiladi.
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setIcon(await fileToIcon(file));
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ilova nomi"
            className="w-full rounded-2xl os-glass px-4 py-3 text-sm text-os-on-wallpaper outline-none placeholder:text-os-on-wallpaper/45"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com"
            inputMode="url"
            className="w-full rounded-2xl os-glass px-4 py-3 text-sm text-os-on-wallpaper outline-none placeholder:text-os-on-wallpaper/45"
          />
          {error && <p className="text-xs text-destructive-foreground/90">{error}</p>}
          <button
            onClick={submit}
            className="w-full rounded-2xl bg-os-on-wallpaper py-3 text-sm font-semibold text-[oklch(0.18_0.05_270)] transition-transform active:scale-[0.98]"
          >
            Qoʻshish
          </button>
        </div>
      </div>
    </div>
  );
}
