import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CopyButton, Input, Switch, useConfirm } from "@/components/ui";
import { EventForm, validateEvent, type EventFormValues } from "@/components/EventForm";
import { toLocalInput } from "@/lib/utils";
import { deleteEvent, updateEvent, type EventSummary } from "@/services/admin";
import { refreshEvent } from "./refresh";

export default function SettingsTab({ event, ticketCount }: { event: EventSummary; ticketCount: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const initial = (): EventFormValues => ({ name: event.name, venue: event.venue, startsAt: toLocalInput(event.startsAt), gates: [], accessCode: "" });
  const [values, setValues] = useState<EventFormValues>(initial);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setValues(initial()), [event.name, event.venue, event.startsAt]);

  const dirty = values.name !== event.name || values.venue !== event.venue || values.startsAt !== toLocalInput(event.startsAt);

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

  const saveDetails = () => {
    const error = validateEvent(values, false);
    if (error) return toast.error(error);
    run(
      "details",
      () => updateEvent(event.id, { name: values.name.trim(), venue: values.venue.trim(), startsAt: new Date(values.startsAt).toISOString() }),
      "Event updated."
    );
  };

  const changeCode = async (next: string) => {
    const ok = await confirm({
      title: "Change the event code?",
      message: "Door devices signed in with the old code are signed out and need the new one.",
      confirmLabel: "Change code",
    });
    if (ok && (await run("code", () => updateEvent(event.id, { accessCode: next }), "Event code changed."))) setCode("");
  };

  const toggleActive = async (active: boolean) => {
    if (!active) {
      const ok = await confirm({
        title: "Deactivate this event?",
        message: "Ticket checkers stop seeing it in the app and its event code stops working. You can turn it back on any time.",
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    run("active", () => updateEvent(event.id, { isActive: active }), active ? "Event is active." : "Event deactivated.");
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${event.name}?`,
      message: "Its gates and ticket checker assignments are removed too. This can't be undone.",
      confirmLabel: "Delete event",
      danger: true,
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await deleteEvent(event.id);
      toast.success("Event deleted.");
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      navigate("/events", { replace: true });
    } catch {
      setBusy(null);
    }
  };

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm values={values} onChange={setValues} />
          <div className="mt-4 flex justify-end gap-2">
            {dirty && (
              <Button variant="outline" onClick={() => setValues(initial())}>
                Reset
              </Button>
            )}
            <Button onClick={saveDetails} disabled={!dirty} loading={busy === "details"}>
              Save details
            </Button>
          </div>
        </CardContent>
      </Card>

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
          <Switch checked={event.isActive} onChange={toggleActive} disabled={busy === "active"} label="Event active" />
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
          <Button variant="dangerOutline" onClick={remove} disabled={ticketCount > 0} loading={busy === "delete"}>
            Delete event
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
