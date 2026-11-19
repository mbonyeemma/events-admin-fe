import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark } from "@/components/Layout";
import { Button, Input, Label } from "@/components/ui";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex items-center gap-3 bg-sidebar px-8 py-10 text-white lg:w-[44%] lg:flex-col lg:items-start lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <BrandMark className="h-11 w-11 rounded-xl [&>svg]:h-7 [&>svg]:w-7" />
          <span className="text-2xl font-black tracking-tight">Lyxa Events</span>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white">
            Run the doors.
            <br />
            Every event, every gate.
          </h1>
          <p className="mt-4 max-w-sm text-white/70">Create events, issue tickets and assign ticket checkers to gates.</p>
        </div>
        <div className="hidden text-xs text-white/50 lg:block">Admin panel</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="headline text-3xl">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Admin accounts only.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                className="h-11 pl-9"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0772 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                className="h-11 pl-9"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!phone || !password}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
