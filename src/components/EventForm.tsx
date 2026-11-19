import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { toLocalInput } from "@/lib/utils";

export interface EventFormValues {
  name: string;
  venue: string;
  startsAt: string; // datetime-local
  gates: string[];
  accessCode: string;
}

export const emptyEvent = (): EventFormValues => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(19, 0, 0, 0);
  return { name: "", venue: "", startsAt: toLocalInput(d), gates: ["Main Gate"], accessCode: "" };
};

export function validateEvent(v: EventFormValues, withGates: boolean): string | null {
  if (!v.name.trim()) return "Give the event a name.";
  if (!v.venue.trim()) return "Add the venue.";
  if (!v.startsAt || Number.isNaN(new Date(v.startsAt).getTime())) return "Pick the start date and time.";
  if (withGates && v.gates.length === 0) return "Add at least one gate.";
  if (v.accessCode && !/^[A-Za-z0-9]{4,20}$/.test(v.accessCode.replace(/[\s-]/g, ""))) return "Event code: 4–20 letters or digits.";
  return null;
}

/** Name, venue, start; on create also gates and an optional event code. */
export function EventForm({
  values,
  onChange,
  withGates,
}: {
  values: EventFormValues;
  onChange: (v: EventFormValues) => void;
  withGates?: boolean;
}) {
  const [gate, setGate] = useState("");
  const set = (patch: Partial<EventFormValues>) => onChange({ ...values, ...patch });
  const addGate = () => {
    const label = gate.trim();
    if (!label || values.gates.some((g) => g.toLowerCase() === label.toLowerCase())) return;
    set({ gates: [...values.gates, label] });
    setGate("");
  };

  return (
    <div className="space-y-4">
      <Field label="Event name">
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nile Jazz Night" maxLength={150} autoFocus={withGates} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue">
          <Input value={values.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Kampala Serena Hotel" maxLength={150} />
        </Field>
        <Field label="Starts">
          <Input type="datetime-local" value={values.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
      </div>
      {withGates && (
        <>
          <Field label="Gates" hint="Where tickets are checked. Ticket checkers can be posted to one gate.">
            <div className="flex flex-wrap gap-2">
              {values.gates.map((g) => (
                <span key={g} className="inline-flex items-center gap-1 rounded-lg bg-accent py-1 pl-3 pr-1 text-sm font-semibold text-foreground">
                  {g}
                  <button
                    type="button"
                    aria-label={`Remove ${g}`}
                    onClick={() => set({ gates: values.gates.filter((x) => x !== g) })}
                    className="rounded p-0.5 text-muted-foreground hover:bg-card hover:text-foreground"
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
              <Button variant="outline" onClick={addGate} disabled={!gate.trim()}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </Field>
          <Field label="Event code (optional)" hint="Lets door devices open just this event without an account. Leave empty to generate one.">
            <Input
              value={values.accessCode}
              onChange={(e) => set({ accessCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
              placeholder="e.g. JAZZ26"
              maxLength={20}
              className="font-mono tracking-widest"
            />
          </Field>
        </>
      )}
    </div>
  );
}
