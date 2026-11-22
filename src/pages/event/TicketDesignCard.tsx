import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field } from "@/components/ui";
import { ImagePicker } from "@/components/ImagePicker";
import { TicketPreview } from "@/components/TicketPreview";
import { cn } from "@/lib/utils";
import { listTicketTypes, mediaUrl, updateEvent, type EventSummary } from "@/services/admin";
import { ColorChoice } from "./TicketTypesCard";
import { refreshEvent } from "./refresh";

/** Colour and artwork of the tickets, with a live preview per ticket type. */
export function TicketDesignCard({ event }: { event: EventSummary }) {
  const qc = useQueryClient();
  const [color, setColor] = useState(event.ticketColor);
  const [imageId, setImageId] = useState<string | null>(event.ticketImageId);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewComp, setPreviewComp] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: types = [] } = useQuery({
    queryKey: ["ticket-types", event.id],
    queryFn: () => listTicketTypes(event.id).then((r) => r.data ?? []),
  });

  useEffect(() => {
    setColor(event.ticketColor);
    setImageId(event.ticketImageId);
  }, [event.ticketColor, event.ticketImageId]);

  const type = types.find((t) => t.id === previewType) ?? null;
  const dirty = color !== event.ticketColor || imageId !== event.ticketImageId;

  const save = async () => {
    setSaving(true);
    try {
      await updateEvent(event.id, { ticketColor: color, ticketImageId: imageId });
      toast.success("Ticket design saved.");
      refreshEvent(qc, event.id);
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-col items-start">
        <CardTitle>Ticket design</CardTitle>
        <CardDescription>How tickets look when you download or send them. Each ticket carries its own QR code.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Field label="Colour">
            <ColorChoice value={color} onChange={(c) => setColor(c ?? "#1E0A3C")} />
          </Field>
          <Field label="Ticket image">
            <ImagePicker
              imageId={imageId}
              onChange={setImageId}
              emptyLabel={event.bannerId ? "Using the banner — add a different image" : "Add an image"}
              hint="Shown at the top of every ticket. Without one, the event banner is used."
            />
          </Field>
          <div className="flex justify-end gap-2">
            {dirty && (
              <Button
                variant="outline"
                onClick={() => {
                  setColor(event.ticketColor);
                  setImageId(event.ticketImageId);
                }}
              >
                Reset
              </Button>
            )}
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Save design
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {types.length > 0 &&
              [null, ...types.map((t) => t.id)].map((id) => {
                const label = id ? types.find((t) => t.id === id)!.name : "Event";
                return (
                  <button
                    key={id ?? "event"}
                    onClick={() => setPreviewType(id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      previewType === id ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-secondary"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            <button
              onClick={() => setPreviewComp(!previewComp)}
              aria-pressed={previewComp}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                previewComp ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-accent",
                types.length > 0 && "ml-auto"
              )}
            >
              <Gift className="h-3 w-3" /> Comp
            </button>
          </div>
          <TicketPreview
            art={{
              eventName: event.name,
              startsAt: event.startsAt,
              endsAt: event.endsAt,
              venue: event.venue,
              address: event.address,
              holderName: "Guest name",
              typeName: type?.name ?? types[0]?.name ?? "General Admission",
              price: type ? type.price : types[0]?.price ?? null,
              complimentary: previewComp,
              currency: type?.currency ?? types[0]?.currency ?? "UGX",
              code: "TKT-SAMPLE-0001",
              color: type?.color ?? color,
              imageUrl: mediaUrl(imageId ?? event.bannerId),
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
