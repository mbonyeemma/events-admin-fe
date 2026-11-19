import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Loading,
  Modal,
  Textarea,
  useConfirm,
} from "@/components/ui";
import { cn, formatMoney, parseAmount, TICKET_COLORS } from "@/lib/utils";
import {
  createTicketType,
  deleteTicketType,
  listTicketTypes,
  updateTicketType,
  type EventSummary,
  type TicketType,
} from "@/services/admin";
import { refreshEvent } from "./refresh";

const PRESETS = ["Ordinary", "VIP 1", "VIP 2", "VVIP", "Table", "Early bird"];

export function ColorChoice({ value, onChange, fallback }: { value: string | null; onChange: (c: string | null) => void; fallback?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {fallback && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold",
            value === null ? "border-primary bg-accent text-foreground" : "border-input text-muted-foreground hover:bg-accent"
          )}
        >
          <span className="h-4 w-4 rounded-full" style={{ background: fallback }} /> Event colour
        </button>
      )}
      {TICKET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          onClick={() => onChange(c)}
          className={cn("h-9 w-9 rounded-full border-2 transition-transform hover:scale-105", value?.toUpperCase() === c ? "border-primary ring-2 ring-primary/30" : "border-white shadow")}
          style={{ background: c }}
        />
      ))}
      <label className="relative flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-xs font-semibold text-muted-foreground hover:bg-accent">
        <span className="h-4 w-4 rounded-full border" style={{ background: value ?? fallback ?? "#1E0A3C" }} />
        Custom
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value ?? fallback ?? "#1E0A3C"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      </label>
    </div>
  );
}

function TicketTypeModal({ event, type, onClose }: { event: EventSummary; type: TicketType | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(type?.name ?? "");
  const [price, setPrice] = useState(type ? String(type.price) : "");
  const [capacity, setCapacity] = useState(type?.capacity ? String(type.capacity) : "");
  const [notes, setNotes] = useState(type?.notes ?? "");
  const [color, setColor] = useState<string | null>(type?.color ?? null);
  const [saving, setSaving] = useState(false);
  const amount = parseAmount(price);

  const submit = async () => {
    if (!name.trim()) return toast.error("Name the ticket type, e.g. VIP 1.");
    if (amount === null) return toast.error("Enter the price, e.g. 200000 or 200k (0 for free).");
    if (capacity && !(Number.isInteger(Number(capacity)) && Number(capacity) >= 1)) return toast.error("Quantity must be a whole number.");
    const body = { name: name.trim(), price: amount, capacity: capacity ? Number(capacity) : null, notes: notes.trim() || null, color };
    setSaving(true);
    try {
      if (type) await updateTicketType(event.id, type.id, body);
      else await createTicketType(event.id, body);
      toast.success(type ? "Ticket type saved." : `${body.name} added.`);
      qc.invalidateQueries({ queryKey: ["ticket-types", event.id] });
      refreshEvent(qc, event.id);
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={type ? `Edit ${type.name}` : "Add ticket type"}
      description={type && type.issued > 0 ? "Changing the price only affects tickets issued from now on." : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {type ? "Save" : "Add ticket type"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP 1" maxLength={60} autoFocus />
          {!type && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setName(p)} className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary">
                  {p}
                </button>
              ))}
            </div>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Price (${type?.currency ?? "UGX"})`} hint={amount !== null && price ? formatMoney(amount, type?.currency) : "e.g. 200000, 200k or 1.5m; 0 = free"}>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="200k" inputMode="decimal" />
          </Field>
          <Field label="Quantity (optional)" hint={type && type.issued > 0 ? `${type.issued} already issued` : "Leave empty for no limit"}>
            <Input type="number" min={type?.issued || 1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="No limit" />
          </Field>
        </div>
        <Field label="Notes (optional)" hint="What it includes. Shown to you and your team, e.g. “Table for 8, 2 bottles”.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="min-h-[80px]" placeholder="Front rows, free welcome drink" />
        </Field>
        <Field label="Ticket colour">
          <ColorChoice value={color} onChange={setColor} fallback={event.ticketColor} />
        </Field>
      </div>
    </Modal>
  );
}

export function TicketTypesCard({ event }: { event: EventSummary }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<TicketType | "new" | null>(null);
  const { data: types = [], isLoading } = useQuery({
    queryKey: ["ticket-types", event.id],
    queryFn: () => listTicketTypes(event.id).then((r) => r.data ?? []),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ticket-types", event.id] });
    refreshEvent(qc, event.id);
  };

  const toggle = async (t: TicketType) => {
    try {
      await updateTicketType(event.id, t.id, { isActive: !t.isActive });
      toast.success(t.isActive ? `${t.name} turned off.` : `${t.name} is on sale again.`);
      refresh();
    } catch {
      /* toast shown */
    }
  };

  const remove = async (t: TicketType) => {
    if (!(await confirm({ title: `Delete ${t.name}?`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await deleteTicketType(event.id, t.id);
      toast.success(`${t.name} deleted.`);
      refresh();
    } catch {
      /* toast shown */
    }
  };

  const typeTotal = types.every((t) => t.capacity !== null) ? types.reduce((s, t) => s + (t.capacity ?? 0), 0) : null;

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div className="space-y-1">
          <CardTitle>Ticket types</CardTitle>
          <CardDescription>What you sell: e.g. Ordinary, VIP 1, VIP 2, Table, each with its price, quantity and notes.</CardDescription>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Add ticket type
        </Button>
      </CardHeader>
      {isLoading ? (
        <Loading />
      ) : types.length === 0 ? (
        <EmptyState icon={Tags} title="No ticket types yet. Tickets use a free-text tier until you add some." />
      ) : (
        <div className="divide-y border-t">
          {types.map((t) => (
            <div key={t.id} className={cn("flex flex-wrap items-start gap-4 px-5 py-4", !t.isActive && "opacity-60")}>
              <span className="mt-1 h-5 w-5 shrink-0 rounded-full" style={{ background: t.color ?? event.ticketColor }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">{t.name}</span>
                  {!t.isActive && <Badge variant="muted">Off</Badge>}
                  {t.remaining === 0 && t.isActive && <Badge variant="destructive">Sold out</Badge>}
                </div>
                {t.notes && <p className="mt-0.5 text-sm text-muted-foreground">{t.notes}</p>}
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums text-foreground">{t.price === 0 ? "Free" : formatMoney(t.price, t.currency)}</div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  {t.capacity !== null ? `${t.issued} / ${t.capacity} issued` : `${t.issued} issued`} · {formatMoney(t.revenue, t.currency)}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`} title="Edit" onClick={() => setEditing(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t.isActive ? `Turn off ${t.name}` : `Turn on ${t.name}`} title={t.isActive ? "Stop issuing" : "Issue again"} onClick={() => toggle(t)}>
                  <Power className={cn("h-4 w-4", t.isActive ? "text-muted-foreground" : "text-success")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Delete ${t.name}`}
                  title={t.issued > 0 ? "Tickets were issued; turn it off instead" : "Delete"}
                  disabled={t.issued > 0}
                  onClick={() => remove(t)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {event.ticketLimit !== null && typeTotal !== null && typeTotal > event.ticketLimit && (
        <p className="border-t px-5 py-3 text-xs text-warning">
          Ticket types add up to {typeTotal.toLocaleString()}, more than the event's total of {event.ticketLimit.toLocaleString()}. Issuing stops at {event.ticketLimit.toLocaleString()}.
        </p>
      )}
      {editing && <TicketTypeModal event={event} type={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
