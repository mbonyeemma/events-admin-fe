import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight, ScanLine, Ticket, Users } from "lucide-react";
import { PageHeader } from "@/components/Layout";
import { Button, Card, CardHeader, CardTitle, EmptyState, Loading, PageError, ProgressBar, StatCard } from "@/components/ui";
import { EventStatusBadge, OutcomeBadge } from "@/components/StatusBadges";
import { eventPhase, formatDate, formatNumber, formatTime, percent } from "@/lib/utils";
import { getOverview, listEvents, mediaUrl, type EventSummary } from "@/services/admin";

export function DateTile({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d.toLocaleDateString(undefined, { month: "short" })}</span>
      <span className="font-display text-xl font-bold leading-none text-foreground">{d.getDate()}</span>
    </div>
  );
}

/** The event's banner as a small thumbnail, or its date when there's no banner. */
export function EventThumb({ event }: { event: Pick<EventSummary, "bannerId" | "startsAt"> }) {
  const src = event.bannerId ? mediaUrl(event.bannerId) : null;
  if (!src) return <DateTile iso={event.startsAt} />;
  return <img src={src} alt="" className="h-12 w-14 shrink-0 rounded-xl bg-accent object-cover" loading="lazy" />;
}

function EventRow({ event }: { event: EventSummary }) {
  return (
    <Link to={`/events/${event.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/70 sm:px-6">
      <EventThumb event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-foreground">{event.name}</span>
          <span className="shrink-0">
            <EventStatusBadge startsAt={event.startsAt} isActive={event.isActive} />
          </span>
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {formatDate(event.startsAt)} · {formatTime(event.startsAt)} · {event.venue}
        </div>
      </div>
      <div className="hidden w-36 sm:block">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="font-semibold text-foreground">
            {formatNumber(event.admittedCount)} / {formatNumber(event.ticketCount)}
          </span>
          <span className="text-muted-foreground">{percent(event.admittedCount, event.ticketCount)}%</span>
        </div>
        <ProgressBar value={event.admittedCount} max={event.ticketCount} />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
    </Link>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => getOverview().then((r) => r.data!), refetchInterval: 15_000 });
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents().then((r) => r.data ?? []) });

  const next = (events.data ?? [])
    .filter((e) => e.isActive && eventPhase(e.startsAt) !== "past")
    .slice(0, 6);
  const o = overview.data;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      {/* "New event" lives in the sidebar, so the page doesn't repeat it. */}
      <PageHeader kicker={today} title="Dashboard" />

      {overview.isError ? (
        <PageError />
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            tone="brand"
            label="Tickets issued"
            icon={Ticket}
            value={o ? formatNumber(o.tickets.issued) : "–"}
            hint={o ? `${formatNumber(o.tickets.checkedIn)} checked in` : undefined}
          />
          <StatCard
            label="Upcoming events"
            icon={CalendarDays}
            value={o ? formatNumber(o.events.upcoming) : "–"}
            hint={o ? `${formatNumber(o.events.total)} in total` : undefined}
          />
          <StatCard
            label="Scans today"
            icon={ScanLine}
            value={o ? formatNumber(o.today.scans) : "–"}
            hint={o ? `${formatNumber(o.today.admitted)} admitted · ${formatNumber(o.today.rejected)} turned away` : undefined}
          />
          <StatCard
            label="Ticket checkers"
            icon={Users}
            value={o ? formatNumber(o.checkers.active) : "–"}
            hint={o ? `${formatNumber(o.checkers.total - o.checkers.active)} inactive` : undefined}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle>Now and next</CardTitle>
            <Link to="/events" className="flex items-center gap-1 text-sm font-semibold text-violet hover:underline">
              All events <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          {events.isLoading ? (
            <Loading />
          ) : next.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              action={
                <Button size="sm" onClick={() => navigate("/events?new=1")}>
                  Create an event
                </Button>
              }
            />
          ) : (
            <div className="divide-y pb-2">{next.map((e) => <EventRow key={e.id} event={e} />)}</div>
          )}
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Latest scans</CardTitle>
          </CardHeader>
          {overview.isLoading ? (
            <Loading />
          ) : !o || o.recentScans.length === 0 ? (
            <EmptyState icon={ScanLine} title="No scans yet" />
          ) : (
            <ul className="divide-y px-5 pb-3 sm:px-6">
              {o.recentScans.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
                    <ScanLine className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{s.holderName ?? s.ticketId}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <Link to={`/events/${s.eventId}`} className="hover:underline">
                        {s.eventName}
                      </Link>
                      {" · "}
                      {s.gate ?? "—"} · {s.staffName}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <OutcomeBadge outcome={s.outcome} />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{formatTime(s.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
