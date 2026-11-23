import { useState } from "react";
import { Lock, Plus, X } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Select } from "@/components/ui";
import { ImagePicker } from "@/components/ImagePicker";
import { EVENT_TYPES, toLocalInput } from "@/lib/utils";
import type { EventDetailsInput, EventSummary } from "@/services/admin";

export interface EventFormValues {
  name: string;
  eventType: string;
  venue: string;
  address: string;
  startsAt: string; // datetime-local
  endsAt: string; // datetime-local, may be empty
  bannerId: string | null;
  ticketLimit: string; // empty = no limit
  ticketLimitLocked: boolean;
  /** Edit mode: the limit was already fixed on the server. */
  limitFixed?: boolean;
  gates: string[];
  accessCode: string;
}

export const emptyEvent = (): EventFormValues => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(19, 0, 0, 0);
  return {
    name: "",
    eventType: "",
    venue: "",
    address: "",
    startsAt: toLocalInput(d),
    endsAt: "",
    bannerId: null,
    ticketLimit: "",
    ticketLimitLocked: false,
    gates: ["Main Gate"],
    accessCode: "",
  };
};

export const eventToForm = (e: EventSummary): EventFormValues => ({
  name: e.name,
  eventType: e.eventType ?? "",
  venue: e.venue,
  address: e.address ?? "",
  startsAt: toLocalInput(e.startsAt),
  endsAt: e.endsAt ? toLocalInput(e.endsAt) : "",
  bannerId: e.bannerId,
  ticketLimit: e.ticketLimit ? String(e.ticketLimit) : "",
  ticketLimitLocked: e.ticketLimitLocked,
  limitFixed: e.ticketLimitLocked,
  gates: [],
  accessCode: "",
});

/** Values for the API (create and update share these fields). */
export const formToInput = (v: EventFormValues): EventDetailsInput => ({
  name: v.name.trim(),
  venue: v.venue.trim(),
  startsAt: new Date(v.startsAt).toISOString(),
  endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
  address: v.address.trim() || null,
  eventType: v.eventType.trim() || null,
  bannerId: v.bannerId,
  ticketLimit: v.ticketLimit ? Number(v.ticketLimit) : null,
  ticketLimitLocked: v.ticketLimitLocked,
});

export function validateEvent(v: EventFormValues, creating: boolean): string | null {
  if (!v.name.trim()) return "Give the event a name.";
  if (!v.venue.trim()) return "Add the venue.";
  if (!v.startsAt || Number.isNaN(new Date(v.startsAt).getTime())) return "Pick the start date and time.";
  if (v.endsAt && new Date(v.endsAt) <= new Date(v.startsAt)) return "The event must end after it starts.";
  if (v.ticketLimit && !(Number.isInteger(Number(v.ticketLimit)) && Number(v.ticketLimit) >= 1)) return "Total tickets must be a whole number.";
  if (v.ticketLimitLocked && !v.ticketLimit) return "Set the total tickets before fixing it.";
  if (creating && v.gates.length === 0) return "Add at least one gate.";
  if (v.accessCode && !/^[A-Za-z0-9]{4,20}$/.test(v.accessCode.replace(/[\s-]/g, ""))) return "Event code: 4–20 letters or digits.";
  return null;
}

/** Banner, name, type, location, date and time, ticket limit; on create also gates and an optional event code. */
/**
 * The event's details. `layout="stack"` (default) is one column, for the event's Settings tab.
 * `layout="page"` lays the same fields out as cards in two columns, for the New event page.
 */
export function EventForm({
  values,
  onChange,
  creating,
  layout = "stack",
}: {
  values: EventFormValues;
  onChange: (v: EventFormValues) => void;
  creating?: boolean;
  layout?: "stack" | "page";
}) {
  const [gate, setGate] = useState("");
  const set = (patch: Partial<EventFormValues>) => onChange({ ...values, ...patch });
  const customType = values.eventType !== "" && !EVENT_TYPES.includes(values.eventType);
  const addGate = () => {
    const label = gate.trim();
    if (!label || values.gates.some((g) => g.toLowerCase() === label.toLowerCase())) return;
    set({ gates: [...values.gates, label] });
    setGate("");
  };

  const banner = (
    <Field label="Banner">
      <ImagePicker
        imageId={values.bannerId}
        onChange={(bannerId) => set({ bannerId })}
        emptyLabel="Add a banner"
        hint="A wide image works best, e.g. 1600 × 800. It also goes on tickets unless you pick a ticket image."
      />
    </Field>
  );

  const details = (
    <>
      <Field label="Event name">
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Jazz on the Hill" maxLength={150} autoFocus={creating} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event type">
          <Select
            value={customType ? "Other" : values.eventType}
            onChange={(e) => set({ eventType: e.target.value === "Other" ? "Other" : e.target.value })}
          >
            <option value="">Choose…</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        {(values.eventType === "Other" || customType) && (
          <Field label="Type name">
            <Input
              value={values.eventType === "Other" ? "" : values.eventType}
              onChange={(e) => set({ eventType: e.target.value || "Other" })}
              placeholder="e.g. Fashion show"
              maxLength={40}
            />
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue">
          <Input value={values.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Canal Olympia Rebero" maxLength={150} />
        </Field>
        <Field label="Address (optional)">
          <Input value={values.address} onChange={(e) => set({ address: e.target.value })} placeholder="KG 7 Ave, Kigali" maxLength={255} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts">
          <Input type="datetime-local" value={values.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
        <Field label="Ends (optional)">
          <Input type="datetime-local" value={values.endsAt} min={values.startsAt} onChange={(e) => set({ endsAt: e.target.value })} />
        </Field>
      </div>
    </>
  );

  const ticketLimit = (
    <Field
      label="Total tickets"
      hint={
        values.limitFixed
          ? "Fixed: this number can't be changed."
          : "The most tickets that can be issued for this event, across all ticket types. Leave empty for no limit."
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-40">
          <Input
            type="number"
            min={1}
            value={values.ticketLimit}
            onChange={(e) => set({ ticketLimit: e.target.value })}
            placeholder="No limit"
            disabled={values.limitFixed}
          />
          {values.limitFixed && <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        </div>
        {!values.limitFixed && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#1E0A3C]"
              checked={values.ticketLimitLocked}
              onChange={(e) => set({ ticketLimitLocked: e.target.checked })}
            />
            Fixed — can't be changed later
          </label>
        )}
      </div>
    </Field>
  );

  const gates = (
    <Field label="Gates" hint="Where tickets are checked. Ticket checkers can be posted to one gate.">
      <div className="flex flex-wrap gap-2">
        {values.gates.map((g) => (
          <span key={g} className="inline-flex items-center gap-1 rounded-full bg-accent py-1 pl-3 pr-1 text-sm font-semibold text-foreground">
            {g}
            <button
              type="button"
              aria-label={`Remove ${g}`}
              onClick={() => set({ gates: values.gates.filter((x) => x !== g) })}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={gate}
          onChange={(e) => setGate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addGate();
            }
          }}
          placeholder="Add a gate, e.g. VIP Entrance"
          maxLength={60}
        />
        <Button variant="outline" className="h-11" onClick={addGate} disabled={!gate.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </Field>
  );

  const accessCode = (
    <Field label="Event code (optional)" hint="Lets door devices open just this event without an account. Leave empty to generate one.">
      <Input
        value={values.accessCode}
        onChange={(e) => set({ accessCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
        placeholder="e.g. JAZZ26"
        maxLength={20}
        className="font-mono tracking-widest"
      />
    </Field>
  );

  if (layout === "page")
    return (
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">{details}</CardContent>
          </Card>
          {creating && (
            <Card>
              <CardHeader>
                <CardTitle>At the gate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gates}
                {accessCode}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardContent className="pt-5 sm:pt-6">{banner}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent>{ticketLimit}</CardContent>
          </Card>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      {banner}
      {details}
      {ticketLimit}
      {creating && (
        <>
          {gates}
          {accessCode}
        </>
      )}
    </div>
  );
}
