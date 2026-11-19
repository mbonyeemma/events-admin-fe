import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, KeyRound, LayoutDashboard, LogOut, Menu, TicketCheck, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatPhone } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { changeOwnPassword } from "@/services/admin";
import { Button, Field, Input, Modal } from "@/components/ui";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/checkers", label: "Ticket checkers", icon: Users },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-white", className)}>
      <TicketCheck className="h-5 w-5 text-primary" strokeWidth={2.2} />
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (next.length < 8) return toast.error("New password must be at least 8 characters.");
    setSaving(true);
    try {
      await changeOwnPassword(current, next);
      toast.success("Password changed.");
      setCurrent("");
      setNext("");
      onClose();
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
      title="Change your password"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!current || !next}>
            Change password
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <BrandMark />
        <span className="text-lg font-black tracking-tight">Lyxa Events</span>
        <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Admin</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-white text-primary" : "text-white/75 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-2">
          <div className="truncate text-sm font-semibold">{admin?.name}</div>
          <div className="truncate text-xs text-white/60">{formatPhone(admin?.phone)}</div>
        </div>
        <button
          onClick={() => setPasswordOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
        >
          <KeyRound className="h-4 w-4" />
          Change password
        </button>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-sidebar px-4 py-3 text-white lg:hidden">
          <button onClick={() => setOpen((v) => !v)} className="rounded-md p-1.5 hover:bg-white/10" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <BrandMark className="h-7 w-7" />
          <span className="font-black tracking-tight">Lyxa Events</span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="headline text-[28px] leading-tight">{title}</h1>
        {description && <div className="mt-1 text-[15px] text-muted-foreground">{description}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
