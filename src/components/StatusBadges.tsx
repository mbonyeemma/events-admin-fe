import { Gift } from "lucide-react";
import { Badge } from "@/components/ui";
import { eventPhase } from "@/lib/utils";
import type { ScanOutcome, TicketStatus } from "@/services/admin";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  if (status === "used") return <Badge variant="success">Checked in</Badge>;
  if (status === "void") return <Badge variant="destructive">Void</Badge>;
  return <Badge variant="muted">Not in</Badge>;
}

/** Complimentary ticket; hover shows who it is for. */
export function CompBadge({ note }: { note?: string | null }) {
  return (
    <Badge title={note ? `Complimentary: ${note}` : "Complimentary"}>
      <Gift className="h-3 w-3" />
      Comp
    </Badge>
  );
}

export function OutcomeBadge({ outcome }: { outcome: ScanOutcome }) {
  if (outcome === "valid") return <Badge variant="success">Admitted</Badge>;
  if (outcome === "used") return <Badge variant="warning">Already in</Badge>;
  return <Badge variant="destructive">Invalid</Badge>;
}

export function EventStatusBadge({ startsAt, isActive }: { startsAt: string; isActive: boolean }) {
  if (!isActive) return <Badge variant="muted">Inactive</Badge>;
  const phase = eventPhase(startsAt);
  if (phase === "live")
    return (
      <Badge variant="success">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Live
      </Badge>
    );
  if (phase === "today") return <Badge variant="solid">Today</Badge>;
  if (phase === "past") return <Badge variant="muted">Ended</Badge>;
  return <Badge>Upcoming</Badge>;
}

export function RoleBadge({ role }: { role: "ticket_checker" | "admin" }) {
  return role === "admin" ? <Badge variant="solid">Admin</Badge> : <Badge>Ticket checker</Badge>;
}
