import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, DoorOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Input, useConfirm } from "@/components/ui";
import { addGate, removeGate, renameGate, type Assignment, type EventSummary, type Gate } from "@/services/admin";
import { refreshEvent } from "./refresh";

function GateRow({ event, gate, checkers, onlyGate }: { event: EventSummary; gate: Gate; checkers: number; onlyGate: boolean }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(gate.label);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!label.trim() || label.trim() === gate.label) return setEditing(false);
    setBusy(true);
    try {
      await renameGate(event.id, gate.id, label.trim());
      toast.success("Gate renamed.");
      setEditing(false);
      refreshEvent(qc, event.id);
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Remove ${gate.label}?`,
      message:
        checkers > 0
          ? `${checkers} ticket checker${checkers === 1 ? " is" : "s are"} posted here; they'll be able to pick any gate. Past scans keep the gate name.`
          : "Past scans keep the gate name.",
      confirmLabel: "Remove gate",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await removeGate(event.id, gate.id);
      toast.success("Gate removed.");
      refreshEvent(qc, event.id);
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <DoorOpen className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      {editing ? (
        <>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            onFocus={(e) => e.currentTarget.select()}
            maxLength={60}
            className="h-9 max-w-xs"
            autoFocus
          />
          <Button size="icon" variant="ghost" onClick={save} loading={busy} aria-label="Save">
            {!busy && <Check className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground">{gate.label}</div>
            <div className="text-xs text-muted-foreground">
              {checkers} ticket checker{checkers === 1 ? "" : "s"} posted
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label={`Rename ${gate.label}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={remove}
            disabled={onlyGate || busy}
            title={onlyGate ? "An event needs at least one gate" : "Remove gate"}
            aria-label={`Remove ${gate.label}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export default function GatesTab({ event, assignments }: { event: EventSummary; assignments: Assignment[] }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!label.trim()) return;
    setAdding(true);
    try {
      await addGate(event.id, label.trim());
      toast.success("Gate added.");
      setLabel("");
      refreshEvent(qc, event.id);
    } catch {
      /* toast shown */
    } finally {
      setAdding(false);
    }
  };

  const unposted = assignments.filter((a) => !a.gateId).length;

  return (
    <div className="max-w-2xl">
      <Card className="divide-y">
        {event.gates.map((g) => (
          <GateRow
            key={g.id}
            event={event}
            gate={g}
            checkers={assignments.filter((a) => a.gateId === g.id).length}
            onlyGate={event.gates.length === 1}
          />
        ))}
        <div className="flex gap-2 px-5 py-4">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New gate, e.g. VIP Entrance"
            maxLength={60}
          />
          <Button onClick={add} loading={adding} disabled={!label.trim()}>
            <Plus className="h-4 w-4" /> Add gate
          </Button>
        </div>
      </Card>
      {unposted > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {unposted} ticket checker{unposted === 1 ? " isn't" : "s aren't"} posted to a gate and can pick any gate in the app.
        </p>
      )}
    </div>
  );
}
