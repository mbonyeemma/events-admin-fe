import type { QueryClient } from "@tanstack/react-query";

/** After a change to an event, refresh everything that shows its numbers. */
export function refreshEvent(qc: QueryClient, eventId: string) {
  for (const key of [["event", eventId], ["event-stats", eventId], ["tickets", eventId], ["assignments", eventId], ["scans", eventId], ["events"], ["overview"], ["staff"]]) {
    qc.invalidateQueries({ queryKey: key });
  }
}
