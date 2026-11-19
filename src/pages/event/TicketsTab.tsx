import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Download, FileUp, Plus, Search, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CopyButton,
  EmptyState,
  Field,
  Input,
  Loading,
  Modal,
  Pagination,
  Segmented,
  Table,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  TR,
  useConfirm,
} from "@/components/ui";
import { TicketStatusBadge } from "@/components/StatusBadges";
import { download, formatDateTime, parseCsv, toCsv } from "@/lib/utils";
import {
  issueTickets,
  listTickets,
  resetTicket,
  updateTicket,
  voidTicket,
  type EventSummary,
  type NewTicket,
  type Ticket,
} from "@/services/admin";
import { refreshEvent } from "./refresh";

const PAGE = 50;
const DEFAULT_TIER = "General Admission";
type StatusFilter = "" | "valid" | "used" | "void";

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* --------------------------- Issue tickets --------------------------- */

const CSV_EXAMPLE = `name, tier, email, phone, code
Amina Okello, VIP, amina@example.com, 0772 123456
James Mutebi, General Admission`;

/** Rows from CSV: header row optional (name, tier, email, phone, code in any order). */
function rowsToTickets(text: string): { tickets: NewTicket[]; errors: string[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { tickets: [], errors: [] };
  const header = rows[0].map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => ["name", "holder", "holder name", "tier"].includes(h));
  const col = (names: string[], fallback: number) => {
    if (!hasHeader) return fallback;
    const i = header.findIndex((h) => names.includes(h));
    return i;
  };
  const idx = {
    name: col(["name", "holder", "holder name", "holdername"], 0),
    tier: col(["tier", "type", "ticket type"], 1),
    email: col(["email", "holder email"], 2),
    phone: col(["phone", "holder phone", "mobile"], 3),
    code: col(["code", "ticket", "ticket code", "ticketcode"], 4),
  };
  const errors: string[] = [];
  const tickets = (hasHeader ? rows.slice(1) : rows).flatMap((r, i) => {
    const get = (k: keyof typeof idx) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
    const holderName = get("name");
    if (!holderName) {
      errors.push(`Row ${i + 1 + (hasHeader ? 1 : 0)}: missing name`);
      return [];
    }
    const t: NewTicket = { holderName, tier: get("tier") || DEFAULT_TIER };
    if (get("email")) t.holderEmail = get("email");
    if (get("phone")) t.holderPhone = get("phone");
    if (get("code")) t.ticketCode = get("code").toUpperCase();
    return [t];
  });
  return { tickets, errors };
}

function IssueTicketsModal({ event, open, onClose }: { event: EventSummary; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"one" | "bulk">("one");
  const [one, setOne] = useState({ holderName: "", tier: DEFAULT_TIER, holderEmail: "", holderPhone: "", quantity: "1" });
  const [csv, setCsv] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => rowsToTickets(csv), [csv]);

  const reset = () => {
    setOne({ holderName: "", tier: DEFAULT_TIER, holderEmail: "", holderPhone: "", quantity: "1" });
    setCsv("");
  };

  const submit = async () => {
    let tickets: NewTicket[];
    if (mode === "one") {
      const qty = Math.floor(Number(one.quantity));
      if (!one.holderName.trim()) return toast.error("Enter the ticket holder's name.");
      if (!(qty >= 1 && qty <= 100)) return toast.error("Quantity must be 1 to 100.");
      const base: NewTicket = { holderName: one.holderName.trim(), tier: one.tier.trim() || DEFAULT_TIER };
      if (one.holderEmail.trim()) base.holderEmail = one.holderEmail.trim();
      if (one.holderPhone.trim()) base.holderPhone = one.holderPhone.trim();
      tickets = Array.from({ length: qty }, () => ({ ...base }));
    } else {
      if (parsed.errors.length) return toast.error(parsed.errors[0]);
      if (parsed.tickets.length === 0) return toast.error("Paste or upload at least one row.");
      tickets = parsed.tickets;
    }
    setSaving(true);
    let issued = 0;
    try {
      for (let i = 0; i < tickets.length; i += 500) {
        const res = await issueTickets(event.id, tickets.slice(i, i + 500));
        issued += res.data?.length ?? 0;
      }
      toast.success(`${issued.toLocaleString()} ticket${issued === 1 ? "" : "s"} issued.`);
      reset();
      onClose();
    } catch {
      if (issued) toast.message(`${issued} tickets were issued before the error.`);
    } finally {
      refreshEvent(qc, event.id);
      setSaving(false);
    }
  };

  const count = mode === "one" ? Math.max(1, Math.floor(Number(one.quantity)) || 1) : parsed.tickets.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue tickets"
      description={event.name}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={count === 0}>
            Issue {count > 0 ? count.toLocaleString() : ""} ticket{count === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="mb-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "one", label: "One holder" },
            { value: "bulk", label: "Many (CSV)" },
          ]}
        />
      </div>

      {mode === "one" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label="Holder name">
              <Input value={one.holderName} onChange={(e) => setOne({ ...one, holderName: e.target.value })} maxLength={150} autoFocus />
            </Field>
            <Field label="Quantity">
              <Input type="number" min={1} max={100} value={one.quantity} onChange={(e) => setOne({ ...one, quantity: e.target.value })} />
            </Field>
          </div>
          <Field label="Tier">
            <Input value={one.tier} onChange={(e) => setOne({ ...one, tier: e.target.value })} maxLength={60} list="tiers" />
            <datalist id="tiers">
              <option value="General Admission" />
              <option value="VIP" />
              <option value="VVIP" />
              <option value="Early Bird" />
            </datalist>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email (optional)">
              <Input type="email" value={one.holderEmail} onChange={(e) => setOne({ ...one, holderEmail: e.target.value })} maxLength={150} />
            </Field>
            <Field label="Phone (optional)">
              <Input value={one.holderPhone} onChange={(e) => setOne({ ...one, holderPhone: e.target.value })} maxLength={30} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Ticket codes are generated. Each ticket gets its own QR code to send or print.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Field
            label="Rows"
            hint={
              <>
                One ticket per line: <span className="font-mono">name, tier, email, phone, code</span>. Only the name is required; a header row is
                optional.
              </>
            }
          >
            <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={CSV_EXAMPLE} className="min-h-[160px] font-mono text-xs" />
          </Field>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground hover:underline">
            <FileUp className="h-4 w-4" /> Upload a .csv file
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setCsv(await file.text());
                e.target.value = "";
              }}
            />
          </label>
          {parsed.errors.length > 0 && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {parsed.errors.slice(0, 3).join(" · ")}
              {parsed.errors.length > 3 ? ` · +${parsed.errors.length - 3} more` : ""}
            </p>
          )}
          {parsed.tickets.length > 0 && (
            <div className="rounded-lg border">
              <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
                {parsed.tickets.length.toLocaleString()} ticket{parsed.tickets.length === 1 ? "" : "s"} ready
              </div>
              <Table>
                <TBody>
                  {parsed.tickets.slice(0, 5).map((t, i) => (
                    <TR key={i}>
                      <TD className="py-2 font-semibold text-foreground">{t.holderName}</TD>
                      <TD className="py-2">{t.tier}</TD>
                      <TD className="py-2 text-xs text-muted-foreground">{[t.holderEmail, t.holderPhone].filter(Boolean).join(" · ")}</TD>
                      <TD className="py-2 font-mono text-xs">{t.ticketCode ?? "auto"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {parsed.tickets.length > 5 && <div className="px-3 py-2 text-xs text-muted-foreground">…and {parsed.tickets.length - 5} more</div>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* --------------------------- One ticket --------------------------- */

function TicketModal({ ticket, event, onClose }: { ticket: Ticket | null; event: EventSummary; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [qr, setQr] = useState("");
  const [form, setForm] = useState({ holderName: "", tier: "", holderEmail: "", holderPhone: "" });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) return;
    setForm({
      holderName: ticket.holderName,
      tier: ticket.tier,
      holderEmail: ticket.holderEmail ?? "",
      holderPhone: ticket.holderPhone ?? "",
    });
    QRCode.toDataURL(ticket.ticketId, { margin: 1, width: 480, color: { dark: "#1E0A3C", light: "#FFFFFF" } }).then(setQr);
  }, [ticket]);

  if (!ticket) return null;

  const run = async (name: string, work: () => Promise<unknown>, done: string) => {
    setBusy(name);
    try {
      await work();
      toast.success(done);
      refreshEvent(qc, event.id);
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setBusy(null);
    }
  };

  const dirty =
    form.holderName !== ticket.holderName ||
    form.tier !== ticket.tier ||
    form.holderEmail !== (ticket.holderEmail ?? "") ||
    form.holderPhone !== (ticket.holderPhone ?? "");

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket.holderName}
      description={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{ticket.ticketId}</span>
          <TicketStatusBadge status={ticket.status} />
        </span>
      }
      size="lg"
      footer={
        <div className="flex w-full flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {ticket.status === "used" && (
              <Button
                variant="outline"
                loading={busy === "reset"}
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Undo check-in?",
                      message: "The ticket becomes valid again and can be scanned in once more.",
                      confirmLabel: "Undo check-in",
                    })
                  )
                    run("reset", () => resetTicket(ticket.ticketId), "Check-in undone.");
                }}
              >
                Undo check-in
              </Button>
            )}
            {ticket.status !== "void" && (
              <Button
                variant="dangerOutline"
                loading={busy === "void"}
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Void this ticket?",
                      message: "Scanning it will show Invalid at every gate. This can't be undone.",
                      confirmLabel: "Void ticket",
                      danger: true,
                    })
                  )
                    run("void", () => voidTicket(ticket.ticketId), "Ticket voided.");
                }}
              >
                Void
              </Button>
            )}
          </div>
          <Button
            disabled={!dirty || !form.holderName.trim()}
            loading={busy === "save"}
            onClick={() =>
              run(
                "save",
                () =>
                  updateTicket(ticket.ticketId, {
                    holderName: form.holderName.trim(),
                    tier: form.tier.trim() || DEFAULT_TIER,
                    holderEmail: form.holderEmail.trim(),
                    holderPhone: form.holderPhone.trim(),
                  }),
                "Ticket updated."
              )
            }
          >
            Save changes
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl border p-2">{qr ? <img src={qr} alt={`QR code for ${ticket.ticketId}`} className="h-44 w-44" /> : <div className="h-44 w-44" />}</div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={!qr} onClick={() => fetch(qr).then((r) => r.blob()).then((b) => download(`${ticket.ticketId}.png`, b))}>
              <Download className="h-4 w-4" /> QR code
            </Button>
            <CopyButton value={ticket.ticketId} label="Copy ticket code" />
          </div>
        </div>
        <div className="space-y-3">
          {ticket.status === "used" && (
            <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              Checked in {formatDateTime(ticket.scannedAt)}
              {ticket.scannedGate ? ` · ${ticket.scannedGate}` : ""}
              {ticket.scannedByName ? ` · ${ticket.scannedByName}` : ""}
            </div>
          )}
          <Field label="Holder name">
            <Input value={form.holderName} onChange={(e) => setForm({ ...form, holderName: e.target.value })} maxLength={150} />
          </Field>
          <Field label="Tier">
            <Input value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} maxLength={60} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <Input value={form.holderEmail} onChange={(e) => setForm({ ...form, holderEmail: e.target.value })} maxLength={150} />
            </Field>
            <Field label="Phone">
              <Input value={form.holderPhone} onChange={(e) => setForm({ ...form, holderPhone: e.target.value })} maxLength={30} />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------- Tab --------------------------- */

export default function TicketsTab({ event }: { event: EventSummary }) {
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [issuing, setIssuing] = useState(false);
  const [open, setOpen] = useState<Ticket | null>(null);
  const [exporting, setExporting] = useState(false);
  const q = useDebounced(search.trim());

  useEffect(() => setPage(0), [status, q]);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", event.id, status, q, page],
    queryFn: () => listTickets(event.id, { status, search: q, limit: PAGE, offset: page * PAGE }).then((r) => r.data!),
    placeholderData: (prev) => prev,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: Ticket[] = [];
      for (let offset = 0; ; offset += 200) {
        const res = await listTickets(event.id, { status, search: q, limit: 200, offset });
        all.push(...(res.data?.tickets ?? []));
        if (all.length >= (res.data?.total ?? 0) || (res.data?.tickets.length ?? 0) === 0) break;
      }
      const rows = [
        ["Ticket code", "Holder", "Tier", "Email", "Phone", "Status", "Checked in at", "Gate", "Checked in by"],
        ...all.map((t) => [t.ticketId, t.holderName, t.tier, t.holderEmail, t.holderPhone, t.status, t.scannedAt, t.scannedGate, t.scannedByName]),
      ];
      download(`${event.name.replace(/[^\w]+/g, "-").toLowerCase()}-tickets.csv`, toCsv(rows));
    } catch {
      /* toast shown */
    } finally {
      setExporting(false);
    }
  };

  const tickets = data?.tickets ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email or code" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Segmented<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All" },
            { value: "valid", label: "Not in" },
            { value: "used", label: "Checked in" },
            { value: "void", label: "Void" },
          ]}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportCsv} loading={exporting} disabled={!data?.total}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={() => setIssuing(true)}>
            <Plus className="h-4 w-4" /> Issue tickets
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Loading />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title={q || status ? "No tickets match." : "No tickets yet."}
            action={
              !q && !status ? (
                <Button size="sm" onClick={() => setIssuing(true)}>
                  Issue tickets
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Holder</TH>
                  <TH>Ticket</TH>
                  <TH>Tier</TH>
                  <TH>Status</TH>
                  <TH>Checked in</TH>
                </TR>
              </THead>
              <TBody>
                {tickets.map((t) => (
                  <TR key={t.ticketId} className="cursor-pointer" onClick={() => setOpen(t)}>
                    <TD>
                      <div className="font-semibold text-foreground">{t.holderName}</div>
                      <div className="text-xs text-muted-foreground">{[t.holderEmail, t.holderPhone].filter(Boolean).join(" · ") || "—"}</div>
                    </TD>
                    <TD className="font-mono text-xs">{t.ticketId}</TD>
                    <TD className="whitespace-nowrap">{t.tier}</TD>
                    <TD>
                      <TicketStatusBadge status={t.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {t.status === "used" ? (
                        <>
                          <div className="text-foreground">{formatDateTime(t.scannedAt)}</div>
                          {[t.scannedGate, t.scannedByName].filter(Boolean).join(" · ")}
                        </>
                      ) : (
                        "—"
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE} count={tickets.length} total={data?.total} onPage={setPage} />
          </>
        )}
      </Card>

      <IssueTicketsModal event={event} open={issuing} onClose={() => setIssuing(false)} />
      <TicketModal ticket={open} event={event} onClose={() => setOpen(null)} />
    </div>
  );
}
