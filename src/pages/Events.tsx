import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarPlus, Pencil, Power, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/Layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Loading,
  PageError,
  ProgressBar,
  Segmented,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { ApprovalBadge, EventStatusBadge } from "@/components/StatusBadges";
import { EventThumb } from "@/pages/Dashboard";
import { eventPhase, formatDate, formatMoney, formatNumber, formatTime, percent } from "@/lib/utils";
import { listEvents, type EventSummary } from "@/services/admin";
import { useEventActions } from "@/pages/event/actions";

type Filter = "upcoming" | "past" | "all" | "waiting";

/** Edit, deactivate or reactivate, and delete, from the list. */
function RowActions({ event }: { event: EventSummary }) {
  const navigate = useNavigate();
  const { busy, setActive, remove } = useEventActions(event, { afterDelete: "stay" });
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit ${event.name}`} onClick={() => navigate(`/events/${event.id}?tab=settings`)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={event.isActive ? "Deactivate" : "Activate"}
        aria-label={`${event.isActive ? "Deactivate" : "Activate"} ${event.name}`}
        className={event.isActive ? "text-muted-foreground" : "text-success"}
        loading={busy === "active"}
        onClick={() => setActive(!event.isActive)}
      >
        {busy !== "active" && <Power className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" title="Delete" aria-label={`Delete ${event.name}`} className="text-destructive" loading={busy === "delete"} onClick={remove}>
        {busy !== "delete" && <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => (params.get("filter") === "waiting" ? "waiting" : "upcoming"));
  const [search, setSearch] = useState("");
  // Rwanda is the default everywhere in GatePass.
  const [country, setCountry] = useState<"all" | "RW" | "UG">("RW");
  const [currency, setCurrency] = useState("all");
  const { data, isLoading, isError } = useQuery({ queryKey: ["events"], queryFn: () => listEvents().then((r) => r.data ?? []) });
  // Old links (/events?new=1) open the New event page.
  useEffect(() => {
    if (params.get("new") === "1") navigate("/events/new", { replace: true });
  }, [params, navigate]);


  const waiting = (data ?? []).filter((e) => e.approval === "pending").length;

  const currencies = useMemo(() => [...new Set((data ?? []).map((e) => e.currency))].sort(), [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data ?? []).filter((e) => {
      if (country !== "all" && e.siteCountry !== country) return false;
      if (currency !== "all" && e.currency !== currency) return false;
      const past = eventPhase(e.startsAt) === "past";
      if (filter === "waiting") return e.approval === "pending" && (!q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));
      if (filter === "upcoming" && past) return false;
      if (filter === "past" && !past) return false;
      return !q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
    });
    // Upcoming: soonest first. Past: most recent first.
    return filter === "past" ? list.reverse() : list;
  }, [data, filter, search, country, currency]);

  // Totals for what's shown: tickets sold, and their value per currency.
  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const e of rows) byCurrency.set(e.currency, (byCurrency.get(e.currency) ?? 0) + e.revenue);
    return { sold: rows.reduce((n, e) => n + e.soldCount, 0), value: [...byCurrency.entries()].filter(([, v]) => v > 0) };
  }, [rows]);

  return (
    <div>
      <PageHeader
        kicker="All events"
        title="Events"
        action={
          <Button className="rounded-full px-5" onClick={() => navigate("/events/new")}>
            <CalendarPlus className="h-4 w-4" /> New event
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={country} onChange={(e) => setCountry(e.target.value as "all" | "RW" | "UG")} className="w-auto min-w-[160px]" aria-label="Country">
          <option value="all">All countries</option>
          <option value="RW">Rwanda</option>
          <option value="UG">Uganda</option>
        </Select>
        <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-auto min-w-[160px]" aria-label="Currency">
          <option value="all">All currencies</option>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            <b className="font-semibold text-foreground">{formatNumber(rows.length)}</b> {rows.length === 1 ? "event" : "events"} ·{" "}
            <b className="font-semibold text-foreground">{formatNumber(totals.sold)}</b> tickets sold
            {totals.value.map(([c, v]) => (
              <span key={c}>
                {" "}
                · <b className="font-semibold text-foreground">{formatMoney(v, c)}</b>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
            { value: "all", label: "All" },
            ...(waiting ? [{ value: "waiting" as const, label: `Waiting for approval ${waiting}` }] : []),
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name or venue" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <div className="p-4">
            <PageError />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={search ? "No events match." : filter === "past" ? "No past events." : "No upcoming events."}
            action={
              !search && filter !== "past" ? (
                <Button size="sm" onClick={() => navigate("/events/new")}>
                  Create an event
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Event</TH>
                <TH>Date</TH>
                <TH>Status</TH>
                <TH className="text-right">Sold</TH>
                <TH className="text-right">Value</TH>
                <TH className="w-40">Checked in</TH>
                <TH className="hidden text-right 2xl:table-cell">Checkers</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((e) => (
                <TR key={e.id} className="cursor-pointer" onClick={() => navigate(`/events/${e.id}`)}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <EventThumb event={e} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="max-w-[260px] truncate font-semibold text-foreground">{e.name}</span>
                          {e.approval !== "approved" ? <ApprovalBadge approval={e.approval} /> : !e.isListed && <Badge variant="warning">Not on site</Badge>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{e.venue}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="whitespace-nowrap">
                    <div className="text-foreground">{formatDate(e.startsAt)}</div>
                    <div className="text-xs text-muted-foreground">{formatTime(e.startsAt)}</div>
                  </TD>
                  <TD>
                    <EventStatusBadge startsAt={e.startsAt} isActive={e.isActive} />
                  </TD>
                  <TD className="text-right font-semibold tabular-nums text-foreground">{formatNumber(e.soldCount)}</TD>
                  <TD className="whitespace-nowrap text-right font-semibold tabular-nums text-foreground">
                    {e.revenue > 0 ? formatMoney(e.revenue, e.currency) : <span className="font-normal text-muted-foreground">—</span>}
                  </TD>
                  <TD>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {formatNumber(e.admittedCount)} / {formatNumber(e.ticketCount)}
                      </span>
                      <span className="text-muted-foreground">{percent(e.admittedCount, e.ticketCount)}%</span>
                    </div>
                    <ProgressBar value={e.admittedCount} max={e.ticketCount} />
                  </TD>
                  <TD className="hidden text-right font-semibold tabular-nums text-foreground 2xl:table-cell">{e.checkerCount ?? 0}</TD>
                  <TD className="text-right" onClick={(ev) => ev.stopPropagation()}>
                    <RowActions event={e} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

    </div>
  );
}
