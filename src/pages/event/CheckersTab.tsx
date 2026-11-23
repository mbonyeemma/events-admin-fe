import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Loading,
  Modal,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useConfirm,
} from "@/components/ui";
import { cn, formatDateTime, formatPhone } from "@/lib/utils";
import { assignStaff, listStaff, unassignStaff, type Assignment, type EventSummary } from "@/services/admin";
import { refreshEvent } from "./refresh";

function GateSelect({ event, value, onChange, disabled }: { event: EventSummary; value: string | null; onChange: (v: string | null) => void; disabled?: boolean }) {
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} disabled={disabled} className="h-9 w-44">
      <option value="">Any gate</option>
      {event.gates.map((g) => (
        <option key={g.id} value={g.id}>
          {g.label}
        </option>
      ))}
    </Select>
  );
}

function AssignModal({
  event,
  assigned,
  open,
  onClose,
}: {
  event: EventSummary;
  assigned: Assignment[];
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listStaff().then((r) => r.data ?? []), enabled: open });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [gateId, setGateId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const available = useMemo(() => {
    const taken = new Set(assigned.map((a) => a.staffId));
    const q = search.trim().toLowerCase();
    return (staff.data ?? []).filter(
      (s) =>
        s.isActive &&
        s.role === "ticket_checker" &&
        !taken.has(s.staffId) &&
        (!q || s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q.replace(/\s/g, "")))
    );
  }, [staff.data, assigned, search]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const close = () => {
    setPicked(new Set());
    setSearch("");
    setGateId(null);
    onClose();
  };

  const submit = async () => {
    setSaving(true);
    let done = 0;
    try {
      for (const id of picked) {
        await assignStaff(event.id, id, gateId);
        done += 1;
      }
      toast.success(`${done} ticket checker${done === 1 ? "" : "s"} assigned.`);
      close();
    } catch {
      /* toast shown */
    } finally {
      refreshEvent(qc, event.id);
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Assign ticket checkers"
      description={event.name}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={picked.size === 0}>
            Assign {picked.size || ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <GateSelect event={event} value={gateId} onChange={setGateId} />
        </div>

        {staff.isLoading ? (
          <Loading />
        ) : available.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No one matches." : "Everyone active is already assigned."}
            action={
              <Link to="/users?new=1" className="text-sm font-semibold text-foreground hover:underline">
                Add a ticket checker
              </Link>
            }
          />
        ) : (
          <div className="max-h-[340px] divide-y overflow-y-auto rounded-lg border">
            {available.length > 1 && (
              <button
                className="w-full px-4 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                onClick={() => setPicked(picked.size === available.length ? new Set() : new Set(available.map((s) => s.staffId)))}
              >
                {picked.size === available.length ? "Clear selection" : `Select all ${available.length}`}
              </button>
            )}
            {available.map((s) => {
              const on = picked.has(s.staffId);
              return (
                <label key={s.staffId} className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/50", on && "bg-accent/60")}>
                  <input type="checkbox" checked={on} onChange={() => toggle(s.staffId)} className="h-4 w-4 accent-[#1E0A3C]" />
                  <Avatar name={s.name} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{formatPhone(s.phone)}</div>
                  </div>
                  {(s.assignmentCount ?? 0) > 0 && <span className="text-xs text-muted-foreground">{s.assignmentCount} events</span>}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function CheckersTab({ event, assignments, loading }: { event: EventSummary; assignments: Assignment[]; loading: boolean }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [assigning, setAssigning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listStaff().then((r) => r.data ?? []) });
  const byId = new Map((staff.data ?? []).map((s) => [s.staffId, s]));

  const changeGate = async (a: Assignment, gateId: string | null) => {
    setBusy(a.staffId);
    try {
      await assignStaff(event.id, a.staffId, gateId);
      toast.success(`${a.name} → ${event.gates.find((g) => g.id === gateId)?.label ?? "any gate"}`);
      refreshEvent(qc, event.id);
    } catch {
      /* toast shown */
    } finally {
      setBusy(null);
    }
  };

  const remove = async (a: Assignment) => {
    const ok = await confirm({
      title: `Remove ${a.name}?`,
      message: "They will no longer see this event in the app or be able to scan its tickets.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setBusy(a.staffId);
    try {
      await unassignStaff(event.id, a.staffId);
      toast.success(`${a.name} removed from this event.`);
      refreshEvent(qc, event.id);
    } catch {
      /* toast shown */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Only assigned ticket checkers see this event in the app. Posting someone to a gate fixes their gate.</p>
        <Button onClick={() => setAssigning(true)}>
          <UserPlus className="h-4 w-4" /> Assign checkers
        </Button>
      </div>

      <Card>
        {loading ? (
          <Loading />
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No ticket checkers assigned."
            action={
              <Button size="sm" onClick={() => setAssigning(true)}>
                Assign checkers
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Ticket checker</TH>
                <TH>Gate</TH>
                <TH>Last sign-in</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {assignments.map((a) => {
                const s = byId.get(a.staffId);
                return (
                  <TR key={a.staffId}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} />
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            {a.name}
                            {s && !s.isActive && <Badge variant="muted">Inactive</Badge>}
                            {s?.role === "admin" && <Badge variant="solid">Admin</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{formatPhone(a.phone)}</div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <GateSelect event={event} value={a.gateId} onChange={(g) => changeGate(a, g)} disabled={busy === a.staffId} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{s?.lastLoginAt ? formatDateTime(s.lastLoginAt) : "Never"}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => remove(a)} disabled={busy === a.staffId} className="text-destructive">
                        <UserMinus className="h-4 w-4" /> Remove
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <AssignModal event={event} assigned={assignments} open={assigning} onClose={() => setAssigning(false)} />
    </div>
  );
}
