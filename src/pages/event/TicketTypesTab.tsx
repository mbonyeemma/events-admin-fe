import { Card, CardContent, CardHeader, CardTitle, ProgressBar } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { EventStats, EventSummary } from "@/services/admin";
import { TicketTypesCard } from "./TicketTypesCard";

/** Ticket types (add, edit, what's left) and check-in per type. */
export default function TicketTypesTab({ event, stats, issued }: { event: EventSummary; stats?: EventStats; issued: number }) {
  return (
    <div className="grid gap-6">
      <TicketTypesCard event={event} issued={issued} />

      {stats && stats.tiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Checked in</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.tiers.map((t) => (
              <div key={t.tier} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-foreground">{t.tier}</span>
                  <span className="whitespace-nowrap tabular-nums text-foreground">
                    {formatNumber(t.checkedIn)} <span className="text-muted-foreground">/ {formatNumber(t.sold)} in</span>
                  </span>
                </div>
                <ProgressBar value={t.checkedIn} max={t.sold} className="mt-2" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {[t.revenue > 0 ? formatMoney(t.revenue, stats.currency) : null, t.complimentary > 0 ? `${formatNumber(t.complimentary)} complimentary` : null]
                    .filter(Boolean)
                    .join(" · ") || " "}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
