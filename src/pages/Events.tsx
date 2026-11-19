import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Loading,
  Modal,
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
import { EventForm, emptyEvent, validateEvent, type EventFormValues } from "@/components/EventForm";
import { DateTile } from "@/pages/Dashboard";
import { eventPhase, formatDate, formatNumber, formatTime, percent } from "@/lib/utils";
import { createEvent, listEvents } from "@/services/admin";

type Filter = "upcoming" | "past" | "all";

export function NewEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [values, setValues] = useState<EventFormValues>(emptyEvent);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const error = validateEvent(values, true);
    if (error) return toast.error(error);
    setSaving(true);
    try {
      const res = await createEvent({
        name: values.name.trim(),
        venue: values.venue.trim(),
        startsAt: new Date(values.startsAt).toISOString(),
        gates: values.gates,
        ...(values.accessCode ? { accessCode: values.accessCode } : {}),
      });
      toast.success("Event created.");
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setValues(emptyEvent());
      onClose();
      navigate(`/events/${res.data!.id}`);
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
      title="New event"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create event
          </Button>
        </>
      }
    >
      <EventForm values={values} onChange={setValues} withGates />
    </Modal>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({ queryKey: ["events"], queryFn: () => listEvents().then((r) => r.data ?? []) });

  const creating = params.get("new") === "1";
  const setCreating = (v: boolean) => setParams(v ? { new: "1" } : {}, { replace: true });

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
        title="Events"
        action={
          <Button onClick={() => setCreating(true)}>
            <CalendarPlus className="h-4 w-4" /> New event
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
                <Button size="sm" onClick={() => setCreating(true)}>
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
                      <DateTile iso={e.startsAt} />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-foreground">{e.name}</div>
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
                    <div className="mb-1 flex justify-between text-xs">
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
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <NewEventModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
