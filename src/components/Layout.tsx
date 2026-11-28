import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, CalendarPlus, LayoutDashboard, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { cn, formatPhone, initials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/team", label: "Team", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

/** The GatePass ticket-stub mark: white on purple surfaces (`light`), purple elsewhere. Same as the site. */
export function BrandMark({ className, light = true }: { className?: string; light?: boolean }) {
  const bg = light ? "#FFFFFF" : "#1E0A3C";
  const ticket = light ? "#1E0A3C" : "#FFFFFF";
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8 shrink-0", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={bg} />
      <path d="M14 22a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v5a5 5 0 0 0 0 10v5a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4v-5a5 5 0 0 0 0-10z" fill={ticket} />
      <path d="M38 21v22" stroke={bg} strokeWidth="2.5" strokeDasharray="3 3" />
    </svg>
  );
}

/** "GatePass" with the small "Admin" label under it. */
export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("leading-tight", className)}>
      <span className="block text-lg font-bold">GatePass</span>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-sun">Admin</span>
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto bg-sidebar text-sidebar-foreground">
      <NavLink to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-6 py-6">
        <BrandMark />
        <BrandName />
      </NavLink>
      <div className="px-4">
        <button
          onClick={() => {
            setOpen(false);
            navigate("/events/new");
          }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-sun text-[15px] font-semibold text-ink transition-colors hover:bg-sun-hover"
        >
          <CalendarPlus className="h-4 w-4" /> New event
        </button>
      </div>
      <nav className="mt-6 flex-1 space-y-1 px-3" aria-label="Admin">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-[264px]">
      {/* Sidebar: fixed on desktop, a drawer on phones */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[280px]">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button onClick={() => setOpen(true)} className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted lg:hidden" aria-label="Open menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="flex min-w-0 flex-1 items-center gap-2.5 lg:hidden">
            <BrandMark light={false} className="h-7 w-7" />
            <span className="font-bold text-foreground">GatePass</span>
          </span>
          <span className="hidden flex-1 lg:block" />
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-sm font-semibold text-foreground">{admin?.name}</span>
            <span className="block text-xs text-muted-foreground">{formatPhone(admin?.phone)}</span>
          </span>
          <NavLink to="/settings" aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white hover:bg-brand-hover">
            {initials(admin?.name ?? "")}
          </NavLink>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-[1360px]">{children}</div>
      </main>

    </div>
  );
}

export function PageHeader({ kicker, title, description, action }: { kicker?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet">{kicker}</p>}
        <h1 className="headline mt-1 text-[32px] leading-none sm:text-[40px]">{title}</h1>
        {description && <div className="mt-2 text-[15px] text-muted-foreground">{description}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
