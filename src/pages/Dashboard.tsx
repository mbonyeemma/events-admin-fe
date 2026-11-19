import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronRight, ScanLine, Ticket, Users } from "lucide-react";
import { PageHeader } from "@/components/Layout";
import { Button, Card, CardHeader, CardTitle, EmptyState, Loading, PageError, ProgressBar, StatCard, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { EventStatusBadge, OutcomeBadge } from "@/components/StatusBadges";
import { formatNumber, formatTime, eventPhase, percent, plural } from "@/lib/utils";
import { getOverview, listEvents, type EventSummary } from "@/services/admin";

export function DateTile({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent">
      <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">{d.toLocaleDateString(undefined, { month: "short" })}</span>
      <span className="text-xl font-black leading-6 text-foreground">{d.getDate()}</span>
    </div>
  );
}

function EventRow({ event }: { event: EventSummary }) {
  return (
    <Link to={`/events/${event.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50">
      <DateTile iso={event.startsAt} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-bold text-foreground">{event.name}</span>
          <span className="shrink-0">
            <EventStatusBadge startsAt={event.startsAt} isActive={event.isActive} />
          </span>
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {formatTime(event.startsAt)} · {event.venue} · {plural(event.checkerCount ?? 0, "checker")}
        </div>
      </div>
      <div className="hidden w-44 sm:block">
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-semibold text-foreground">
            {formatNumber(event.admittedCount)} / {formatNumber(event.ticketCount)}
          </span>
          <span className="text-muted-foreground">{percent(event.admittedCount, event.ticketCount)}%</span>
        </div>
        <ProgressBar value={event.admittedCount} max={event.ticketCount} />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
      <PageHeader
        title="Dashboard"
        description={today}
        action={
          <Button onClick={() => navigate("/events?new=1")}>
            <CalendarPlus className="h-4 w-4" /> New event
          </Button>
        }
      />

      {overview.isError ? (
        <PageError />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Upcoming events"
            icon={CalendarDays}
            value={o ? formatNumber(o.events.upcoming) : "–"}
            hint={o ? `${formatNumber(o.events.total)} in total` : undefined}
          />
          <StatCard
            label="Tickets issued"
            icon={Ticket}
            value={o ? formatNumber(o.tickets.issued) : "–"}
            hint={o ? `${formatNumber(o.tickets.checkedIn)} checked in` : undefined}
          />
          <StatCard
            label="Ticket checkers"
            icon={Users}
            value={o ? formatNumber(o.checkers.active) : "–"}
            hint={o ? `${formatNumber(o.checkers.total - o.checkers.active)} inactive` : undefined}
          />
          <StatCard
            label="Scans today"
            icon={ScanLine}
            value={o ? formatNumber(o.today.scans) : "–"}
            hint={o ? `${formatNumber(o.today.admitted)} admitted · ${formatNumber(o.today.rejected)} rejected` : undefined}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader>
            <CardTitle>Now and next</CardTitle>
            <Link to="/events" className="text-sm font-semibold text-foreground hover:underline">
              All events
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
            <div className="divide-y border-t">{next.map((e) => <EventRow key={e.id} event={e} />)}</div>
          )}
        </Card>

        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle>Latest scans</CardTitle>
          </CardHeader>
          {overview.isLoading ? (
            <Loading />
          ) : !o || o.recentScans.length === 0 ? (
            <EmptyState icon={ScanLine} title="No scans yet" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Ticket</TH>
                  <TH>Checker</TH>
                  <TH className="text-right">Result</TH>
                </TR>
              </THead>
              <TBody>
                {o.recentScans.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      <div className="font-semibold text-foreground">{s.holderName ?? s.ticketId}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(s.createdAt)} · <Link to={`/events/${s.eventId}`} className="hover:underline">{s.eventName}</Link>
                      </div>
                    </TD>
                    <TD>
                      <div className="text-sm">{s.staffName}</div>
                      <div className="text-xs text-muted-foreground">{s.gate ?? "—"}</div>
                    </TD>
                    <TD className="text-right">
                      <OutcomeBadge outcome={s.outcome} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
