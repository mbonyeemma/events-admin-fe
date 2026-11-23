import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CircleAlert, Clock, Download, Receipt, ShieldCheck, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/Layout";
import { Badge, Button, Card, EmptyState, Loading, PageError, Pagination, Segmented, StatCard, Table, Tabs, TBody, TD, TH, THead, TR } from "@/components/ui";
import { RoleBadge } from "@/components/StatusBadges";
import { OrganisersEmpty } from "@/components/OrganisersEmpty";
import { ApiError } from "@/lib/api";
import { compactMoney, download, formatDateTime, formatMoney, formatNumber, formatPhone, toCsv } from "@/lib/utils";
import { listOrders, listStaff, type Order, type OrderStatus } from "@/services/admin";

type Tab = "transactions" | "users" | "organisers";
const TABS: Tab[] = ["transactions", "users", "organisers"];
const PAGE = 25;

const STATUS: Record<OrderStatus, { label: string; variant: "success" | "default" | "warning" | "destructive" | "muted" }> = {
  paid: { label: "Paid", variant: "success" },
  free: { label: "Free", variant: "default" },
  pending: { label: "Waiting", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  expired: { label: "Expired", variant: "muted" },
  refund_due: { label: "Refund due", variant: "destructive" },
};

/** The server answers 404 until online payments (MVend) are switched on. */
const notLive = (error: unknown) => error instanceof ApiError && error.status === 404;

function Transactions() {
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(0);
  const filter = status === "all" ? undefined : status;

  const list = useQuery({
    queryKey: ["orders", status, page],
    queryFn: () => listOrders({ status: filter, limit: PAGE, offset: page * PAGE }).then((r) => r.data!),
    retry: (count, error) => !notLive(error) && count < 1,
  });
  // The totals come from the latest 200 orders (the most the server sends at once).
  const recent = useQuery({
    queryKey: ["orders", "summary"],
    queryFn: () => listOrders({ limit: 200 }).then((r) => r.data!),
    retry: (count, error) => !notLive(error) && count < 1,
  });

  const summary = useMemo(() => {
    const orders = recent.data?.orders ?? [];
    const paid = orders.filter((o) => o.status === "paid");
    const currency = paid[0]?.currency ?? orders[0]?.currency ?? "RWF";
    return {
      currency,
      money: paid.filter((o) => o.currency === currency).reduce((n, o) => n + o.amount, 0),
      paid: paid.length,
      tickets: orders.filter((o) => o.status === "paid" || o.status === "free").reduce((n, o) => n + o.tickets.length, 0),
      waiting: orders.filter((o) => o.status === "pending").length,
      problems: orders.filter((o) => o.status === "failed" || o.status === "refund_due").length,
      sample: orders.length,
      total: recent.data?.total ?? 0,
    };
  }, [recent.data]);

  if (notLive(list.error) || notLive(recent.error))
    return (
      <Card>
        <EmptyState icon={Receipt} title="No transactions yet" />
        <p className="-mt-10 px-6 pb-14 text-center text-sm text-muted-foreground">Online payments aren't live on the server yet. Ticket sales from the GatePass site will show here once they are.</p>
      </Card>
    );

  const exportCsv = () => {
    const rows = (recent.data?.orders ?? []).filter((o) => !filter || o.status === filter);
    download(
      `gatepass-transactions${filter ? `-${filter}` : ""}.csv`,
      toCsv([
        ["Order", "Event", "Buyer", "Phone", "Tickets", "Amount", "Currency", "Status", "Paid with", "Paid at", "Created"],
        ...rows.map((o) => [
          o.code,
          o.eventName,
          o.buyer.name,
          o.buyer.phone,
          o.lines.map((l) => `${l.quantity} x ${l.typeName}`).join("; "),
          o.amount,
          o.currency,
          STATUS[o.status].label,
          o.payment?.wallet ?? "",
          o.paidAt ?? "",
          o.createdAt,
        ]),
      ])
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard tone="brand" label="Money in" icon={Wallet} value={recent.data ? compactMoney(summary.money, summary.currency) : "–"} hint={recent.data ? formatMoney(summary.money, summary.currency) : undefined} />
        <StatCard label="Paid orders" icon={Receipt} value={recent.data ? formatNumber(summary.paid) : "–"} hint={recent.data ? `${formatNumber(summary.tickets)} tickets` : undefined} />
        <StatCard label="Waiting for payment" icon={Clock} value={recent.data ? formatNumber(summary.waiting) : "–"} hint="Mobile Money prompt sent" />
        <StatCard label="Failed or refund due" icon={CircleAlert} value={recent.data ? formatNumber(summary.problems) : "–"} hint="Need a look" />
      </div>
      {recent.data && summary.total > summary.sample && (
        <p className="mt-2 text-xs text-muted-foreground">Totals cover the latest {formatNumber(summary.sample)} of {formatNumber(summary.total)} orders.</p>
      )}

      <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented<OrderStatus | "all">
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "pending", label: "Waiting" },
            { value: "failed", label: "Failed" },
            { value: "refund_due", label: "Refund due" },
          ]}
        />
        <Button variant="outline" onClick={exportCsv} disabled={!recent.data?.orders.length}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <Card>
        {list.isLoading ? (
          <Loading />
        ) : list.isError ? (
          <div className="p-4">
            <PageError />
          </div>
        ) : !list.data?.orders.length ? (
          <EmptyState icon={Receipt} title={status === "all" ? "No transactions yet." : "None with this status."} />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Event</TH>
                  <TH>Buyer</TH>
                  <TH>Tickets</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {list.data.orders.map((o: Order) => (
                  <TR key={o.code}>
                    <TD>
                      <div className="font-mono text-[13px] font-semibold text-foreground">{o.code}</div>
                      <div className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(o.paidAt ?? o.createdAt)}</div>
                    </TD>
                    <TD>
                      <Link to={`/events/${o.eventId}`} className="block max-w-[220px] truncate font-medium text-foreground hover:underline">
                        {o.eventName || "—"}
                      </Link>
                    </TD>
                    <TD>
                      <div className="whitespace-nowrap font-medium text-foreground">{o.buyer.name}</div>
                      <div className="text-xs text-muted-foreground">{formatPhone(o.buyer.phone)}</div>
                    </TD>
                    <TD>
                      {o.lines.map((l) => (
                        <div key={l.typeId} className="whitespace-nowrap">
                          {l.quantity} × {l.typeName}
                        </div>
                      ))}
                    </TD>
                    <TD className="whitespace-nowrap text-right font-semibold tabular-nums text-foreground">{o.amount ? formatMoney(o.amount, o.currency) : "Free"}</TD>
                    <TD>
                      <Badge variant={STATUS[o.status].variant} title={o.failureReason ?? undefined}>
                        {STATUS[o.status].label}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE} count={list.data.orders.length} total={list.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

function UsersReport() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["staff"], queryFn: () => listStaff().then((r) => r.data ?? []) });
  const list = data ?? [];
  const week = Date.now() - 7 * 86_400_000;
  const admins = list.filter((s) => s.role === "admin").length;
  const checkers = list.filter((s) => s.role === "ticket_checker").length;
  const active = list.filter((s) => s.isActive).length;
  const recent = list.filter((s) => s.lastLoginAt && new Date(s.lastLoginAt).getTime() > week).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard tone="brand" label="Users" icon={Users} value={data ? formatNumber(list.length) : "–"} hint={data ? `${formatNumber(active)} active` : undefined} />
        <StatCard label="Admins" icon={ShieldCheck} value={data ? formatNumber(admins) : "–"} hint="Run this panel" />
        <StatCard label="Ticket checkers" icon={Users} value={data ? formatNumber(checkers) : "–"} hint="Scan at the gate" />
        <StatCard label="Signed in this week" icon={Clock} value={data ? formatNumber(recent) : "–"} hint="Last 7 days" />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <h3 className="text-lg font-bold text-foreground">Everyone</h3>
          <Link to="/users" className="flex items-center gap-1 text-sm font-semibold text-violet hover:underline">
            Manage users <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <div className="p-4">
            <PageError />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Role</TH>
                <TH className="text-right">Events</TH>
                <TH>Last sign-in</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {list.map((s) => (
                <TR key={s.staffId} className={s.isActive ? "" : "opacity-60"}>
                  <TD>
                    <div className="whitespace-nowrap font-semibold text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{formatPhone(s.phone)}</div>
                  </TD>
                  <TD>
                    <RoleBadge role={s.role} />
                  </TD>
                  <TD className="text-right tabular-nums">{s.assignmentCount ?? 0}</TD>
                  <TD className="whitespace-nowrap text-sm text-muted-foreground">{s.lastLoginAt ? formatDateTime(s.lastLoginAt) : "Never"}</TD>
                  <TD>{s.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get("tab") as Tab) ? params.get("tab") : "transactions") as Tab;

  return (
    <div>
      <PageHeader kicker="Across GatePass" title="Reports" />
      <Tabs<Tab>
        value={tab}
        onChange={(t) => setParams(t === "transactions" ? {} : { tab: t }, { replace: true })}
        className="mb-6"
        tabs={[
          { value: "transactions", label: "Transactions" },
          { value: "users", label: "Users" },
          { value: "organisers", label: "Organisers" },
        ]}
      />
      {tab === "transactions" && <Transactions />}
      {tab === "users" && <UsersReport />}
      {tab === "organisers" && (
        <Card>
          <OrganisersEmpty />
        </Card>
      )}
    </div>
  );
}
