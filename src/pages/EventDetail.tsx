import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, DoorOpen, MapPin } from "lucide-react";
import { Badge, Card, CopyButton, Loading, PageError, ProgressBar, Tabs } from "@/components/ui";
import { EventStatusBadge } from "@/components/StatusBadges";
import { formatDate, formatMoney, formatNumber, formatTime, percent } from "@/lib/utils";
import { getEvent, getEventStats, listAssignments, mediaUrl } from "@/services/admin";
import TicketsTab from "@/pages/event/TicketsTab";
import CheckersTab from "@/pages/event/CheckersTab";
import GatesTab from "@/pages/event/GatesTab";
import ScansTab from "@/pages/event/ScansTab";
import SettingsTab from "@/pages/event/SettingsTab";

type Tab = "tickets" | "checkers" | "gates" | "scans" | "settings";
const TABS: Tab[] = ["tickets", "checkers", "gates", "scans", "settings"];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
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

  if (event.isLoading) return <Loading />;
  if (event.isError || !event.data) return <PageError message="Event not found." />;

  const e = event.data;
  const s = stats.data;
  const sold = s?.sold ?? e.ticketCount;
  const checkedIn = s?.checkedIn ?? e.admittedCount;

  return (
    <div>
      <Link to="/events" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Events
      </Link>

      {e.bannerId && (
        <img src={mediaUrl(e.bannerId)!} alt="" className="mb-5 aspect-[3/1] w-full rounded-2xl object-cover sm:aspect-[4/1]" />
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <EventStatusBadge startsAt={e.startsAt} isActive={e.isActive} />
            {e.eventType && <Badge variant="muted">{e.eventType}</Badge>}
          </div>
          <h1 className="headline text-[30px] leading-tight">{e.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-body">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {formatDate(e.startsAt)} · {formatTime(e.startsAt)}
              {e.endsAt && ` – ${new Date(e.endsAt).toDateString() === new Date(e.startsAt).toDateString() ? formatTime(e.endsAt) : `${formatDate(e.endsAt)} ${formatTime(e.endsAt)}`}`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {[e.venue, e.address].filter(Boolean).join(", ")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              {e.gates.map((g) => g.label).join(", ")}
            </span>
          </div>
        </div>
        {e.accessCode && (
          <div className="rounded-xl border bg-card px-4 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Event code</div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-lg font-bold tracking-[0.2em] text-foreground">{e.accessCode}</span>
              <CopyButton value={e.accessCode} label="Copy event code" />
            </div>
          </div>
        )}
      </div>

      <Card className="mb-6 grid grid-cols-2 gap-5 p-5 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Stat label="Checked in" value={`${formatNumber(checkedIn)} / ${formatNumber(sold)}`} sub={`${percent(checkedIn, sold)}%`} />
          <ProgressBar value={checkedIn} max={sold} className="mt-2" />
        </div>
        <Stat
          label="Tickets issued"
          value={e.ticketLimit !== null ? `${formatNumber(sold)} / ${formatNumber(e.ticketLimit)}` : formatNumber(sold)}
          sub={[
            e.ticketLimit !== null ? (e.ticketLimitLocked ? "Fixed total" : `${formatNumber(Math.max(e.ticketLimit - sold, 0))} left`) : "No limit",
            s?.voided ? `${formatNumber(s.voided)} voided` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Stat label="Revenue" value={formatMoney(s?.revenue ?? 0, s?.currency)} sub={`${formatNumber(s?.notCheckedIn ?? sold - checkedIn)} not in yet`} />
        <Stat label="Ticket checkers" value={formatNumber(assignments.data?.length ?? e.checkerCount ?? 0)} sub={`${e.gates.length} gates`} />
        {s && (s.tiers.length > 1 || s.revenue > 0) && (
          <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 md:col-span-4">
            {s.tiers.map((t) => (
              <div key={t.tier} className="min-w-[140px] flex-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">{t.tier}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatNumber(t.checkedIn)} / {formatNumber(t.sold)}
                    {t.revenue > 0 && ` · ${formatMoney(t.revenue, s.currency)}`}
                  </span>
                </div>
                <ProgressBar value={t.checkedIn} max={t.sold} className="mt-1 h-1.5" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        className="mb-5"
        tabs={[
          { value: "tickets", label: "Tickets", count: sold + (s?.voided ?? 0) },
          { value: "checkers", label: "Ticket checkers", count: assignments.data?.length },
          { value: "gates", label: "Gates", count: e.gates.length },
          { value: "scans", label: "Scan log" },
          { value: "settings", label: "Settings" },
        ]}
      />

      {tab === "tickets" && <TicketsTab event={e} />}
      {tab === "checkers" && <CheckersTab event={e} assignments={assignments.data ?? []} loading={assignments.isLoading} />}
      {tab === "gates" && <GatesTab event={e} assignments={assignments.data ?? []} />}
      {tab === "scans" && <ScansTab event={e} />}
      {tab === "settings" && <SettingsTab event={e} ticketCount={sold + (s?.voided ?? 0)} />}
    </div>
  );
}
