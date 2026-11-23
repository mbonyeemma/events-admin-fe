import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Loading,
  PageError,
  ProgressBar,
  Segmented,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { EventStatusBadge } from "@/components/StatusBadges";
import { EventThumb } from "@/pages/Dashboard";
import { eventPhase, formatDate, formatNumber, formatTime, percent } from "@/lib/utils";
import { listEvents } from "@/services/admin";

type Filter = "upcoming" | "past" | "all";

export default function Events() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({ queryKey: ["events"], queryFn: () => listEvents().then((r) => r.data ?? []) });
  // Old links (/events?new=1) open the New event page.
  useEffect(() => {
    if (params.get("new") === "1") navigate("/events/new", { replace: true });
  }, [params, navigate]);


  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data ?? []).filter((e) => {
      const past = eventPhase(e.startsAt) === "past";
      if (filter === "upcoming" && past) return false;
      if (filter === "past" && !past) return false;
      return !q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
    });
    // Upcoming: soonest first. Past: most recent first.
    return filter === "past" ? list.reverse() : list;
  }, [data, filter, search]);

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
            { value: "all", label: "All" },
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
                <TH className="w-48">Checked in</TH>
                <TH className="text-right">Checkers</TH>
                <TH className="text-right">Gates</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {rows.map((e) => (
                <TR key={e.id} className="cursor-pointer" onClick={() => navigate(`/events/${e.id}`)}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <EventThumb event={e} />
                      <div className="min-w-0">
                        <div className="max-w-[280px] truncate font-semibold text-foreground">{e.name}</div>
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
                  <TD>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {formatNumber(e.admittedCount)} / {formatNumber(e.ticketCount)}
                      </span>
                      <span className="text-muted-foreground">{percent(e.admittedCount, e.ticketCount)}%</span>
                    </div>
                    <ProgressBar value={e.admittedCount} max={e.ticketCount} />
                  </TD>
                  <TD className="text-right font-semibold tabular-nums text-foreground">{e.checkerCount ?? 0}</TD>
                  <TD className="text-right tabular-nums">{e.gates.length}</TD>
                  <TD className="w-8 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-faint" />
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
