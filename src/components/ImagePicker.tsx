import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { BANNER, cn, prepareBanner, prepareImage } from "@/lib/utils";
import { mediaUrl, uploadImage } from "@/services/admin";

/**
 * Pick an image, upload it right away, and hand back its id.
 * `aspect="banner"`: an event banner, cropped to 16:9 and saved at 1600 × 900 (the server checks the size).
 * `required`: it can be changed but not removed.
 */
export function ImagePicker({
  imageId,
  onChange,
  emptyLabel = "Add an image",
  hint,
  className,
  aspect = "wide",
  required,
  invalid,
}: {
  imageId: string | null;
  onChange: (id: string | null) => void;
  emptyLabel?: string;
  hint?: string;
  className?: string;
  aspect?: "banner" | "wide" | "square";
  required?: boolean;
  /** Show the empty frame as an error (e.g. a required banner that's missing). */
  invalid?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = mediaUrl(imageId);
  const banner = aspect === "banner";

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = banner ? await prepareBanner(file) : await prepareImage(file);
      const res = await uploadImage(data, banner ? "banner" : undefined);
      onChange(res.data!.id);
    } catch (e) {
      // Server errors are already shown.
      if (e instanceof Error && !(e instanceof ApiError)) toast.error(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const ratio = banner ? "aspect-video" : aspect === "wide" ? "aspect-[2/1]" : "aspect-square";
  const note = hint ?? (banner ? `${BANNER.width} × ${BANNER.height}` : undefined);
  return (
    <div className={cn("space-y-2", className)}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {url ? (
        <div className={cn("group relative overflow-hidden rounded-xl border bg-muted", ratio)}>
          <img src={url} alt="" className="h-full w-full object-cover" />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Spinner />
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
              Change
            </Button>
            {!required && (
              <Button size="sm" variant="secondary" onClick={() => onChange(null)} disabled={busy} aria-label="Remove image">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/40 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent",
            ratio,
            aspect === "square" && "max-w-[180px]",
            invalid && "border-destructive/60 bg-destructive/5 text-destructive hover:border-destructive"
          )}
        >
          {busy ? <Spinner /> : <ImagePlus className="h-6 w-6" />}
          {busy ? "Uploading…" : emptyLabel}
        </button>
      )}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
