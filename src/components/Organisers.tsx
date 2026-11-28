import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, Button, Table, TBody, TD, TH, THead, TR, useConfirm } from "@/components/ui";
import { formatDateTime, formatPhone } from "@/lib/utils";
import { listAccounts, setAccountActive, type AdminAccount } from "@/services/admin";

/** Organisers: GatePass site accounts that post events. */
export const useOrganisers = () =>
  useQuery({ queryKey: ["accounts", "organizer"], queryFn: () => listAccounts("organizer").then((r) => r.data ?? []) });

/** Search by name, organisation, email or phone. */
export function matchAccount(a: AdminAccount, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    a.name.toLowerCase().includes(q) ||
    (a.organization ?? "").toLowerCase().includes(q) ||
    (a.email ?? "").toLowerCase().includes(q) ||
    (digits.length >= 3 && (a.phone ?? "").replace(/\D/g, "").includes(digits))
  );
}

/** Organisers table. `manage`: with close / reopen. */
export function OrganisersTable({ accounts, manage }: { accounts: AdminAccount[]; manage?: boolean }) {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const toggle = async (a: AdminAccount) => {
    const label = a.organization || a.name;
    if (a.isActive) {
      const ok = await confirm({
        title: `Close ${label}?`,
        message: "They're signed out and can't sign in until it's reopened. Their events stay.",
        confirmLabel: "Close account",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await setAccountActive(a.accountId, !a.isActive);
      toast.success(a.isActive ? `${label} closed.` : `${label} reopened.`);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch {
      /* toast shown */
    }
  };

  return (
    <Table>
      <THead>
        <TR>
          <TH>Organiser</TH>
          <TH>Email</TH>
          <TH>Phone</TH>
          <TH className="text-right">Events</TH>
          <TH className="text-right">Team</TH>
          <TH className="hidden xl:table-cell">Last sign-in</TH>
          <TH>Status</TH>
          {manage && <TH />}
        </TR>
      </THead>
      <TBody>
        {accounts.map((a) => (
          <TR key={a.accountId} className={a.isActive ? "" : "opacity-60"}>
            <TD>
              <div className="flex items-center gap-3">
                <Avatar name={a.organization || a.name} />
                <div className="min-w-0">
                  <div className="whitespace-nowrap font-semibold text-foreground">{a.organization || a.name}</div>
                  {a.organization && <div className="text-xs text-muted-foreground">{a.name}</div>}
                </div>
              </div>
            </TD>
            <TD className="text-sm">{a.email ?? "—"}</TD>
            <TD className="whitespace-nowrap font-mono text-xs">{formatPhone(a.phone)}</TD>
            <TD className="text-right font-semibold tabular-nums text-foreground">{a.eventCount}</TD>
            <TD className="text-right tabular-nums">{a.teamCount}</TD>
            <TD className="hidden whitespace-nowrap text-xs text-muted-foreground xl:table-cell">{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "Never"}</TD>
            <TD>{a.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Closed</Badge>}</TD>
            {manage && (
              <TD>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={a.isActive ? "Close account" : "Reopen"}
                    aria-label={`${a.isActive ? "Close" : "Reopen"} ${a.organization || a.name}`}
                    className={a.isActive ? "text-destructive" : "text-success"}
                    onClick={() => toggle(a)}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </div>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
