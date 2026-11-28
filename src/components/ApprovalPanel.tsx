import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, FilePen, X } from "lucide-react";
import { toast } from "sonner";
import { Button, useConfirm } from "@/components/ui";
import { formatPhone } from "@/lib/utils";
import { setApproval, type EventSummary } from "@/services/admin";

/**
 * An event an organiser posted on the GatePass site: who posted it, and Approve / Reject.
 * Pending (sent for approval) is the one that needs action; a draft is still being written by the
 * organiser, but can be approved or rejected too. Approved events go on the site; rejected ones stay off it.
 */
export function ApprovalPanel({ event }: { event: EventSummary }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  if (!event.owner) return null;
  const owner = event.owner;
  const draft = event.approval === "draft";

  const decide = async (approval: "approved" | "rejected") => {
    if (approval === "rejected") {
      const ok = await confirm({
        title: `Reject ${event.name}?`,
        message: "It stays off the GatePass site. The organiser sees it as not approved.",
        confirmLabel: "Reject",
        danger: true,
      });
      if (!ok) return;
    } else if (draft) {
      const ok = await confirm({
        title: `Approve ${event.name}?`,
        message: "It's still a draft. It goes on the GatePass site now.",
        confirmLabel: "Approve",
      });
      if (!ok) return;
    }
    setBusy(approval);
    try {
      await setApproval(event.id, approval);
      toast.success(approval === "approved" ? `${event.name} is approved and on the site.` : `${event.name} was rejected.`);
      qc.invalidateQueries({ queryKey: ["event", event.id] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    } catch {
      /* toast shown */
    } finally {
      setBusy(null);
    }
  };

  const contact = [owner.email, owner.phone ? formatPhone(owner.phone) : null].filter(Boolean).join(" · ");
  const who = (
    <>
      {draft ? "By" : "Posted by"} <b className="font-semibold text-foreground">{owner.organization || owner.name}</b>
      {owner.organization && ` (${owner.name})`}
      {contact && ` · ${contact}`}
    </>
  );

  if (event.approval === "approved") return <p className="mb-4 text-sm text-muted-foreground">{who}</p>;

  if (draft)
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <FilePen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold text-foreground">Draft</p>
            <p className="text-sm text-muted-foreground">{who}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={() => decide("rejected")} loading={busy === "rejected"}>
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button variant="outline" size="sm" onClick={() => decide("approved")} loading={busy === "approved"}>
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      </div>
    );

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-sun/70 bg-sun/15 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
        <div>
          <p className="font-semibold text-foreground">{event.approval === "pending" ? "Waiting for your approval" : "Rejected"}</p>
          <p className="text-sm text-muted-foreground">
            {who}. {event.approval === "pending" ? "It goes on the GatePass site once you approve it." : "It isn't on the GatePass site."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {event.approval === "pending" && (
          <Button variant="outline" onClick={() => decide("rejected")} loading={busy === "rejected"}>
            <X className="h-4 w-4" /> Reject
          </Button>
        )}
        <Button onClick={() => decide("approved")} loading={busy === "approved"}>
          <Check className="h-4 w-4" /> Approve
        </Button>
      </div>
    </div>
  );
}
