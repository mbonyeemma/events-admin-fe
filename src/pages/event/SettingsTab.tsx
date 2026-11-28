import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CopyButton, Input, Switch, useConfirm } from "@/components/ui";
import { EventForm, eventToForm, formToInput, validateEvent, type EventFormValues } from "@/components/EventForm";
import { updateEvent, type EventSummary } from "@/services/admin";
import { useEventActions } from "./actions";
import { TicketDesignCard } from "./TicketDesignCard";
import { refreshEvent } from "./refresh";

export default function SettingsTab({ event, ticketCount }: { event: EventSummary; ticketCount: number }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [values, setValues] = useState<EventFormValues>(() => eventToForm(event));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const actions = useEventActions({ ...event, ticketCount });

  // Pick up changes saved elsewhere (or by another admin).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setValues(eventToForm(event)), [JSON.stringify(eventToForm(event))]);

  const dirty = JSON.stringify(formToInput(values)) !== JSON.stringify(formToInput(eventToForm(event)));

  const run = async (name: string, work: () => Promise<unknown>, done: string) => {
    setBusy(name);
    try {
      await work();
      toast.success(done);
      refreshEvent(qc, event.id);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveDetails = async () => {
    const error = validateEvent(values, false);
    if (error) return toast.error(error);
    if (values.ticketLimitLocked && !event.ticketLimitLocked) {
      const ok = await confirm({
        title: `Fix the total at ${Number(values.ticketLimit).toLocaleString()} tickets?`,
        message: "Once fixed, the total number of tickets for this event can't be changed.",
        confirmLabel: "Fix it",
      });
      if (!ok) return;
    }
    run("details", () => updateEvent(event.id, formToInput(values)), "Event updated.");
  };

  const changeCode = async (next: string) => {
    const ok = await confirm({
      title: "Change the event code?",
      message: "Door devices signed in with the old code are signed out and need the new one.",
      confirmLabel: "Change code",
    });
    if (ok && (await run("code", () => updateEvent(event.id, { accessCode: next }), "Event code changed."))) setCode("");
  };

  return (
    <div className="grid max-w-4xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm values={values} onChange={setValues} />
          <div className="mt-5 flex justify-end gap-2">
            {dirty && (
              <Button variant="outline" onClick={() => setValues(eventToForm(event))}>
                Reset
              </Button>
            )}
            <Button onClick={saveDetails} disabled={!dirty} loading={busy === "details"}>
              Save details
            </Button>
          </div>
        </CardContent>
      </Card>

      <TicketDesignCard event={event} />

      <Card>
        <CardHeader className="flex-col items-start">
          <CardTitle>Event code</CardTitle>
          <CardDescription>Door devices without an account can open this event with the code (in the app: Event code).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-accent px-4 py-2 font-mono text-2xl font-bold tracking-[0.25em] text-foreground">{event.accessCode ?? "—"}</span>
            {event.accessCode && <CopyButton value={event.accessCode} label="Copy event code" />}
            <Button variant="outline" size="sm" onClick={() => changeCode("regenerate")} loading={busy === "code"}>
              <RefreshCw className="h-4 w-4" /> New random code
            </Button>
          </div>
          <div className="flex max-w-md gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="Set your own, e.g. JAZZ26"
              maxLength={20}
              className="font-mono tracking-widest"
            />
            <Button variant="outline" onClick={() => changeCode(code)} disabled={code.length < 4}>
              Set code
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-5">
          <div>
            <div className="font-bold text-foreground">Active</div>
            <p className="text-sm text-muted-foreground">Inactive events are hidden from ticket checkers and can't be scanned.</p>
          </div>
          <Switch checked={event.isActive} onChange={(on) => actions.setActive(on)} disabled={actions.busy === "active"} label="Event active" />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <div className="font-bold text-foreground">Delete event</div>
            <p className="text-sm text-muted-foreground">
              {ticketCount > 0 ? "Events with tickets are kept for the record. Deactivate it instead." : "Only events without tickets can be deleted."}
            </p>
          </div>
          <Button variant="dangerOutline" onClick={actions.remove} loading={actions.busy === "delete"}>
            Delete event
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
