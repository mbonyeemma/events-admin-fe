import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, DoorOpen, Gift, MapPin, Pencil, Power, ScanLine, Ticket, Trash2, Users, Wallet } from "lucide-react";
import { Badge, Button, CopyButton, Loading, PageError, StatCard, Tabs } from "@/components/ui";
import { ApprovalBadge, EventStatusBadge } from "@/components/StatusBadges";
import { compactMoney, formatDate, formatMoney, formatNumber, formatTime, percent } from "@/lib/utils";
import { getEvent, getEventStats, listAssignments, listTicketTypes, mediaUrl, type EventSummary } from "@/services/admin";
import { useEventActions } from "@/pages/event/actions";
import { ticketsLeft } from "@/pages/event/TicketTypesCard";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import TicketsTab from "@/pages/event/TicketsTab";
import TicketTypesTab from "@/pages/event/TicketTypesTab";
import CheckersTab from "@/pages/event/CheckersTab";
import GatesTab from "@/pages/event/GatesTab";
import ScansTab from "@/pages/event/ScansTab";
import SettingsTab from "@/pages/event/SettingsTab";

type Tab = "tickets" | "types" | "checkers" | "gates" | "scans" | "settings";
const TABS: Tab[] = ["tickets", "types", "checkers", "gates", "scans", "settings"];

/** Edit, deactivate or reactivate, and delete: at the top of the event page. */
function EventActions({ event, onEdit }: { event: Pick<EventSummary, "id" | "name" | "isActive" | "ticketCount">; onEdit: () => void }) {
  const { busy, setActive, remove } = useEventActions(event);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onEdit();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <Pencil className="h-4 w-4" /> Edit
      </Button>
      <Button variant="outline" size="sm" onClick={() => setActive(!event.isActive)} loading={busy === "active"}>
        <Power className="h-4 w-4" /> {event.isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button variant="dangerOutline" size="sm" onClick={remove} loading={busy === "delete"}>
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
    </div>
  );
}

export default function EventDetail() {
  const { eventId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get("tab") as Tab) ? params.get("tab") : "tickets") as Tab;
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true });

  const event = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId).then((r) => r.data!) });
  const stats = useQuery({
    queryKey: ["event-stats", eventId],
    queryFn: () => getEventStats(eventId).then((r) => r.data!),
    refetchInterval: 15_000,
  });
  const assignments = useQuery({ queryKey: ["assignments", eventId], queryFn: () => listAssignments(eventId).then((r) => r.data ?? []) });
  const types = useQuery({ queryKey: ["ticket-types", eventId], queryFn: () => listTicketTypes(eventId).then((r) => r.data ?? []) });

  if (event.isLoading) return <Loading />;
  if (event.isError || !event.data) return <PageError message="Event not found." />;

  const e = event.data;
  const s = stats.data;
  const sold = s?.sold ?? e.ticketCount;
  const checkedIn = s?.checkedIn ?? e.admittedCount;
  const comps = s?.complimentary ?? 0;
  const left = types.data ? ticketsLeft(types.data, e.ticketLimit, sold) : e.ticketLimit !== null ? Math.max(e.ticketLimit - sold, 0) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Events
        </Link>
        <EventActions event={{ ...e, ticketCount: sold + (s?.voided ?? 0) }} onEdit={() => setTab("settings")} />
      </div>

      <div className="mb-6 mt-4 flex flex-col gap-5 md:flex-row md:items-center">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-accent sm:h-24 sm:w-36">
          {e.bannerId ? (
            <img src={mediaUrl(e.bannerId)!} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CalendarDays className="h-7 w-7 text-faint" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge startsAt={e.startsAt} isActive={e.isActive} />
            {e.eventType && <Badge variant="muted">{e.eventType}</Badge>}
            <ApprovalBadge approval={e.approval} />
            {!e.isListed && <Badge variant="warning">Not on the GatePass site</Badge>}
            {e.isListed && e.isFeatured && <Badge variant="solid">Featured on the site</Badge>}
          </div>
          <h1 className="headline mt-2 text-[28px] leading-[1.05] sm:text-[36px]">{e.name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDate(e.startsAt)} · {formatTime(e.startsAt)}
              {e.endsAt && ` – ${new Date(e.endsAt).toDateString() === new Date(e.startsAt).toDateString() ? formatTime(e.endsAt) : `${formatDate(e.endsAt)} ${formatTime(e.endsAt)}`}`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {[e.venue, e.address].filter(Boolean).join(", ")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <DoorOpen className="h-4 w-4" />
              {e.gates.map((g) => g.label).join(", ")}
            </span>
          </div>
        </div>
        {e.accessCode && (
          <div className="self-start rounded-2xl bg-card px-4 py-3 md:self-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Event code</div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-lg font-bold tracking-[0.2em] text-foreground">{e.accessCode}</span>
              <CopyButton value={e.accessCode} label="Copy event code" />
            </div>
          </div>
        )}
      </div>

      <ApprovalPanel event={e} />

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard tone="brand" label="Checked in" icon={ScanLine} value={formatNumber(checkedIn)} hint={`${percent(checkedIn, sold)}% of ${formatNumber(sold)} tickets`}>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-sun" style={{ width: `${Math.min(100, percent(checkedIn, sold))}%` }} />
          </div>
        </StatCard>
        <StatCard
          label="Tickets issued"
          icon={Ticket}
          value={formatNumber(sold)}
          hint={[
            e.ticketLimit !== null ? `of ${formatNumber(e.ticketLimit)}${e.ticketLimitLocked ? ", fixed" : ""}` : null,
            left === null ? "No limit" : left === 0 ? "Sold out" : `${formatNumber(left)} left`,
            s?.voided ? `${formatNumber(s.voided)} voided` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <StatCard label="Complimentary" icon={Gift} value={formatNumber(comps)} hint={`${formatNumber(sold - comps)} paid`} />
        <StatCard label="Money in" icon={Wallet} value={compactMoney(s?.revenue ?? 0, s?.currency)} hint={formatMoney(s?.revenue ?? 0, s?.currency)} />
        <StatCard label="Checkers" icon={Users} value={formatNumber(assignments.data?.length ?? e.checkerCount ?? 0)} hint={`${e.gates.length} ${e.gates.length === 1 ? "gate" : "gates"}`} />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        className="mb-5"
        tabs={[
          { value: "tickets", label: "Tickets", count: sold + (s?.voided ?? 0) },
          { value: "types", label: "Ticket types", count: types.data?.length },
          { value: "checkers", label: "Ticket checkers", count: assignments.data?.length },
          { value: "gates", label: "Gates", count: e.gates.length },
          { value: "scans", label: "Scan log" },
          { value: "settings", label: "Edit & settings" },
        ]}
      />

      {tab === "tickets" && <TicketsTab event={e} />}
      {tab === "types" && <TicketTypesTab event={e} stats={s} issued={sold} />}
      {tab === "checkers" && <CheckersTab event={e} assignments={assignments.data ?? []} loading={assignments.isLoading} />}
      {tab === "gates" && <GatesTab event={e} assignments={assignments.data ?? []} />}
      {tab === "scans" && <ScansTab event={e} />}
      {tab === "settings" && <SettingsTab event={e} ticketCount={sold + (s?.voided ?? 0)} />}
    </div>
  );
}
