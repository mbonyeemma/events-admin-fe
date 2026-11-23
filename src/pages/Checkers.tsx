import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, KeyRound, Pencil, Power, RefreshCw, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/Layout";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  Field,
  Input,
  Loading,
  Modal,
  PageError,
  Segmented,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useConfirm,
} from "@/components/ui";
import { RoleBadge } from "@/components/StatusBadges";
import { OrganisersEmpty } from "@/components/OrganisersEmpty";
import { useAuth } from "@/contexts/AuthContext";
import { eventPhase, formatDate, formatDateTime, formatPhone, formatTime, generatePassword } from "@/lib/utils";
import { createStaff, deleteStaff, listStaff, listStaffEvents, unassignStaff, updateStaff, type Role, type Staff } from "@/services/admin";
import { ApiError } from "@/lib/api";

type RoleFilter = "all" | "ticket_checker" | "admin" | "organiser";

/** Shown once after creating an account or resetting a password. */
function CredentialsModal({ creds, onClose }: { creds: { name: string; phone: string; password: string } | null; onClose: () => void }) {
  if (!creds) return null;
  const text = `GatePass sign-in\nPhone: ${creds.phone}\nPassword: ${creds.password}`;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Sign-in details for ${creds.name}`}
      description="Share these with them now. The password isn't shown again; they can change it in the app's Settings."
      size="sm"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="space-y-3 rounded-xl bg-accent p-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Phone number</div>
          <div className="font-mono text-lg font-bold text-foreground">{creds.phone}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Password</div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-lg font-bold tracking-wider text-foreground">{creds.password}</span>
            <CopyButton value={creds.password} label="Copy password" />
          </div>
        </div>
      </div>
      <Button variant="outline" className="mt-3 w-full" onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success("Copied."))}>
        Copy both
      </Button>
    </Modal>
  );
}

function StaffFormModal({
  staff,
  open,
  onClose,
  onCreated,
}: {
  staff: Staff | null;
  open: boolean;
  onClose: () => void;
  onCreated: (c: { name: string; phone: string; password: string }) => void;
}) {
  const qc = useQueryClient();
  const editing = !!staff;
  const [form, setForm] = useState(() => ({
    name: staff?.name ?? "",
    phone: staff?.phone ?? "",
    email: staff?.email ?? "",
    role: (staff?.role ?? "ticket_checker") as Role,
    password: generatePassword(),
  }));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Enter their name.");
    if (form.phone.replace(/\D/g, "").length < 9) return toast.error("Enter a valid phone number.");
    if (!editing && form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    setSaving(true);
    try {
      if (staff) {
        await updateStaff(staff.staffId, { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null, role: form.role });
        toast.success("Saved.");
      } else {
        const res = await createStaff({
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role: form.role,
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        });
        onCreated({ name: res.data!.name, phone: formatPhone(res.data!.phone), password: form.password });
      }
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${staff!.name}` : "New user"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {editing ? "Save" : "Create account"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" hint="They sign in with this.">
            <Input inputMode="tel" placeholder="078 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email (optional)">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={150} />
          </Field>
        </div>
        <Field label="Role" hint={form.role === "admin" ? "Admins can use this panel and scan any event." : "Uses the app to scan tickets at the events they're assigned to."}>
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="ticket_checker">Ticket checker</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        {!editing && (
          <Field label="Password" hint="You'll see it once more after creating the account, to share it.">
            <div className="flex gap-2">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => setForm({ ...form, password: generatePassword() })} aria-label="New password" title="New password">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
}

function AssignmentsModal({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data, isLoading } = useQuery({
    queryKey: ["staff-events", staff?.staffId],
    queryFn: () => listStaffEvents(staff!.staffId).then((r) => r.data ?? []),
    enabled: !!staff,
  });
  if (!staff) return null;

  const remove = async (eventId: string, eventName: string) => {
    if (!(await confirm({ title: `Remove from ${eventName}?`, confirmLabel: "Remove", danger: true }))) return;
    try {
      await unassignStaff(eventId, staff.staffId);
      toast.success("Removed.");
      qc.invalidateQueries({ queryKey: ["staff-events", staff.staffId] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["assignments", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch {
      /* toast shown */
    }
  };

  const upcoming = (data ?? []).filter((a) => eventPhase(a.startsAt) !== "past");
  const past = (data ?? []).filter((a) => eventPhase(a.startsAt) === "past");

  return (
    <Modal open onClose={onClose} title={staff.name} description={formatPhone(staff.phone)} size="lg">
      {isLoading ? (
        <Loading />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={CalendarDays} title="Not assigned to any event." action={<Link to="/events" className="text-sm font-semibold text-foreground hover:underline" onClick={onClose}>Go to events</Link>} />
      ) : (
        <div className="space-y-4 pb-2">
          {[
            ["Upcoming", upcoming],
            ["Past", past],
          ].map(([title, list]) =>
            (list as typeof upcoming).length ? (
              <div key={title as string}>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title as string}</div>
                <div className="divide-y rounded-lg border">
                  {(list as typeof upcoming).map((a) => (
                    <div key={a.eventId} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Link to={`/events/${a.eventId}?tab=checkers`} onClick={onClose} className="font-semibold text-foreground hover:underline">
                          {a.eventName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(a.startsAt)} · {formatTime(a.startsAt)} · {a.venue}
                        </div>
                      </div>
                      <Badge variant={a.gateLabel ? "default" : "muted"}>{a.gateLabel ?? "Any gate"}</Badge>
                      {!a.isActive && <Badge variant="muted">Inactive</Badge>}
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(a.eventId, a.eventName)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Checkers() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { admin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [role, setRole] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Staff | null>(null);
  const [viewing, setViewing] = useState<Staff | null>(null);
  const [creds, setCreds] = useState<{ name: string; phone: string; password: string } | null>(null);
  const creating = params.get("new") === "1";
  const setCreating = (v: boolean) => setParams(v ? { new: "1" } : {}, { replace: true });

  const { data, isLoading, isError } = useQuery({ queryKey: ["staff"], queryFn: () => listStaff().then((r) => r.data ?? []) });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return (data ?? []).filter(
      (s) =>
        (role === "all" || s.role === role) &&
        (!q || s.name.toLowerCase().includes(q) || (digits.length >= 3 && (s.phone ?? "").replace(/\D/g, "").includes(digits)) || (s.email ?? "").includes(q))
    );
  }, [data, role, search]);

  const counts = useMemo(() => {
    const list = data ?? [];
    return { checkers: list.filter((s) => s.role === "ticket_checker").length, admins: list.filter((s) => s.role === "admin").length };
  }, [data]);

  const resetPassword = async (s: Staff) => {
    const ok = await confirm({
      title: `Reset ${s.name}'s password?`,
      message: "A new password is generated. Their current password stops working.",
      confirmLabel: "Reset password",
    });
    if (!ok) return;
    const password = generatePassword();
    try {
      await updateStaff(s.staffId, { password });
      setCreds({ name: s.name, phone: formatPhone(s.phone), password });
    } catch {
      /* toast shown */
    }
  };

  const remove = async (s: Staff) => {
    const ok = await confirm({
      title: `Delete ${s.name}?`,
      message: "They're removed from every event they were assigned to and can't sign in. This can't be undone.",
      confirmLabel: "Delete user",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteStaff(s.staffId);
      toast.success(`${s.name} deleted.`);
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // They've scanned tickets: their scans name them, so they stay. Offer to deactivate instead.
        const keep = await confirm({
          title: `${s.name} has scanned tickets`,
          message: "People who've scanned tickets are kept for the record, so they can't be deleted. Deactivate them instead? They're signed out at once.",
          confirmLabel: "Deactivate",
          danger: true,
        });
        if (keep && s.isActive) {
          try {
            await updateStaff(s.staffId, { isActive: false });
            toast.success(`${s.name} deactivated.`);
            qc.invalidateQueries({ queryKey: ["staff"] });
            qc.invalidateQueries({ queryKey: ["overview"] });
          } catch {
            /* toast shown */
          }
        }
      } else toast.error(error instanceof Error ? error.message : "Couldn't delete this user.");
    }
  };

  const toggleActive = async (s: Staff) => {
    if (s.isActive) {
      const ok = await confirm({
        title: `Deactivate ${s.name}?`,
        message: "They're signed out at once and can't sign in again until reactivated. Their scans stay in the records.",
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await updateStaff(s.staffId, { isActive: !s.isActive });
      toast.success(s.isActive ? `${s.name} deactivated.` : `${s.name} reactivated.`);
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    } catch {
      /* toast shown */
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Your team"
        title="Users"
        description="Admins run this panel, ticket checkers scan tickets at the gate, and organisers post events."
        action={
          <Button className="rounded-full px-5" onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" /> Add user
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<RoleFilter>
          value={role}
          onChange={setRole}
          options={[
            { value: "all", label: `All ${data ? data.length : ""}`.trim() },
            { value: "admin", label: `Admins ${data ? counts.admins : ""}`.trim() },
            { value: "ticket_checker", label: `Ticket checkers ${data ? counts.checkers : ""}`.trim() },
            { value: "organiser", label: "Organisers" },
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <div className="p-4">
            <PageError />
          </div>
        ) : role === "organiser" ? (
          <OrganisersEmpty />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No one matches." : "No users yet."}
            action={
              !search ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  Add a user
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Role</TH>
                <TH className="text-right">Events</TH>
                <TH className="hidden 2xl:table-cell">Last sign-in</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {rows.map((s) => {
                const me = s.staffId === admin?.staffId;
                return (
                  <TR key={s.staffId} className={s.isActive ? "" : "opacity-60"}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div>
                          <div className="flex items-center gap-2 whitespace-nowrap font-semibold text-foreground">
                            {s.name}
                            {me && <Badge variant="muted">You</Badge>}
                          </div>
                          {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                        </div>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap font-mono text-xs">{formatPhone(s.phone)}</TD>
                    <TD>
                      <RoleBadge role={s.role} />
                    </TD>
                    <TD className="text-right">
                      <button onClick={() => setViewing(s)} className="font-semibold tabular-nums text-foreground hover:underline">
                        {s.assignmentCount ?? 0}
                      </button>
                    </TD>
                    <TD className="hidden whitespace-nowrap text-xs text-muted-foreground 2xl:table-cell">{s.lastLoginAt ? formatDateTime(s.lastLoginAt) : "Never"}</TD>
                    <TD>{s.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Assigned events" aria-label={`Events for ${s.name}`} onClick={() => setViewing(s)}>
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Reset password" aria-label={`Reset password for ${s.name}`} onClick={() => resetPassword(s)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={me ? "You can't deactivate yourself" : s.isActive ? "Deactivate" : "Reactivate"}
                          aria-label={`${s.isActive ? "Deactivate" : "Reactivate"} ${s.name}`}
                          className={s.isActive ? "text-destructive" : "text-success"}
                          disabled={me}
                          onClick={() => toggleActive(s)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={me ? "You can't delete yourself" : "Delete"}
                          aria-label={`Delete ${s.name}`}
                          className="text-destructive"
                          disabled={me}
                          onClick={() => remove(s)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {creating && <StaffFormModal staff={null} open onClose={() => setCreating(false)} onCreated={setCreds} />}
      {editing && <StaffFormModal key={editing.staffId} staff={editing} open onClose={() => setEditing(null)} onCreated={setCreds} />}
      <AssignmentsModal staff={viewing} onClose={() => setViewing(null)} />
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
    </div>
  );
}
