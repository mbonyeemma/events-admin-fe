import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { deleteEvent, updateEvent, type EventSummary } from "@/services/admin";
import { refreshEvent } from "./refresh";

/**
 * Deactivate, reactivate and delete an event, with the confirmations. Used on the event page, its
 * Settings tab and the events list. Events with tickets are kept for the record: deleting one offers
 * to deactivate it instead.
 */
export function useEventActions(event: Pick<EventSummary, "id" | "name" | "isActive" | "ticketCount">, opts: { afterDelete?: "list" | "stay" } = {}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"active" | "delete" | null>(null);

  const setActive = async (active: boolean, ask = true) => {
    if (!active && ask) {
      const ok = await confirm({
        title: `Deactivate ${event.name}?`,
        message: "Ticket checkers stop seeing it in the app and its event code stops working. You can turn it back on any time.",
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy("active");
    try {
      await updateEvent(event.id, { isActive: active });
      toast.success(active ? `${event.name} is active.` : `${event.name} deactivated.`);
      refreshEvent(qc, event.id);
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch {
      /* toast shown */
    } finally {
      setBusy(null);
    }
  };

  const keepInstead = async () => {
    const ok = await confirm({
      title: `${event.name} has tickets`,
      message: "Events with tickets are kept for the record, so it can't be deleted. Deactivate it instead? Ticket checkers stop seeing it.",
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (ok && event.isActive) await setActive(false, false);
  };

  const remove = async () => {
    if (event.ticketCount > 0) return keepInstead();
    const ok = await confirm({
      title: `Delete ${event.name}?`,
      message: "Its gates, ticket types and ticket checker assignments are removed too. This can't be undone.",
      confirmLabel: "Delete event",
      danger: true,
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await deleteEvent(event.id);
      toast.success(`${event.name} deleted.`);
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      if (opts.afterDelete !== "stay") navigate("/events", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) await keepInstead();
      else toast.error(error instanceof Error ? error.message : "Couldn't delete the event.");
    } finally {
      setBusy(null);
    }
  };

  return { busy, setActive, remove };
}
