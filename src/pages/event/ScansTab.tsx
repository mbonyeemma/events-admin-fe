import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { Card, EmptyState, Loading, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { OutcomeBadge } from "@/components/StatusBadges";
import { eventPhase, formatDateTime } from "@/lib/utils";
import { listScans, type EventSummary } from "@/services/admin";

const PAGE = 50;
type OutcomeFilter = "" | "valid" | "used" | "invalid";
const METHOD: Record<string, string> = { scan: "Camera / scanner", manual: "Typed", list: "From list" };

export default function ScansTab({ event }: { event: EventSummary }) {
  const [outcome, setOutcome] = useState<OutcomeFilter>("");
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [outcome]);
  const live = eventPhase(event.startsAt) === "live";

  const { data, isLoading } = useQuery({
    queryKey: ["scans", event.id, outcome, page],
    queryFn: () => listScans(event.id, { outcome, limit: PAGE, offset: page * PAGE }).then((r) => r.data ?? []),
    placeholderData: (prev) => prev,
    // Follow the doors while the event is running.
    refetchInterval: live && page === 0 ? 10_000 : false,
  });
  const scans = data ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<OutcomeFilter>
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: "", label: "All" },
            { value: "valid", label: "Admitted" },
            { value: "used", label: "Already in" },
            { value: "invalid", label: "Invalid" },
          ]}
        />
        {live && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Updating live
          </span>
        )}
      </div>
      <Card>
        {isLoading ? (
          <Loading />
        ) : scans.length === 0 ? (
          <EmptyState icon={ScanLine} title={outcome ? "No scans match." : "No scans yet."} />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Time</TH>
                  <TH>Ticket</TH>
                  <TH>Gate</TH>
                  <TH>Ticket checker</TH>
                  <TH>Result</TH>
                </TR>
              </THead>
              <TBody>
                {scans.map((s) => (
                  <TR key={s.id}>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(s.createdAt)}</TD>
                    <TD>
                      <div className="font-semibold text-foreground">{s.holderName ?? "Unknown ticket"}</div>
                      <div className="font-mono text-xs text-muted-foreground">{s.ticketId}</div>
                    </TD>
                    <TD className="whitespace-nowrap">{s.gate ?? "—"}</TD>
                    <TD>
                      <div className="text-foreground">{s.staffName}</div>
                      <div className="text-xs text-muted-foreground">{METHOD[s.method] ?? s.method}</div>
                    </TD>
                    <TD>
                      <OutcomeBadge outcome={s.outcome} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE} count={scans.length} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
