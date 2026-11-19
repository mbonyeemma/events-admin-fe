import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Spinner } from "@/components/ui";
import { cn, prepareImage } from "@/lib/utils";
import { mediaUrl, uploadImage } from "@/services/admin";

/** Pick an image, upload it right away, and hand back its id. */
export function ImagePicker({
  imageId,
  onChange,
  emptyLabel = "Add an image",
  hint,
  className,
  aspect = "banner",
}: {
  imageId: string | null;
  onChange: (id: string | null) => void;
  emptyLabel?: string;
  hint?: string;
  className?: string;
  aspect?: "banner" | "square";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = mediaUrl(imageId);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await prepareImage(file);
      const res = await uploadImage(data);
      onChange(res.data!.id);
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith("Request failed")) toast.error(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const ratio = aspect === "banner" ? "aspect-[2/1]" : "aspect-square";
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
            <Button size="sm" variant="secondary" onClick={() => onChange(null)} disabled={busy} aria-label="Remove image">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/40 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent",
            ratio,
            aspect === "square" && "max-w-[180px]"
          )}
        >
          {busy ? <Spinner /> : <ImagePlus className="h-6 w-6" />}
          {busy ? "Uploading…" : emptyLabel}
        </button>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
