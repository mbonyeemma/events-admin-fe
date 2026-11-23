import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark, BrandName } from "@/components/Layout";
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
    <div className="flex min-h-[100dvh] flex-col gap-6 p-4 sm:p-6 lg:h-[100dvh] lg:flex-row lg:gap-10 lg:p-8">
      {/* A purple ticket with a photo, as on the GatePass site's login */}
      <div className="relative flex shrink-0 items-center gap-3 overflow-hidden rounded-[28px] bg-sidebar px-6 py-6 text-white lg:w-[46%] lg:flex-col lg:items-start lg:justify-between lg:p-10">
        <img
          src="https://images.unsplash.com/photo-1648708511872-5426c0f29c27?auto=format&fit=crop&w=1200&q=70"
          alt=""
          className="absolute inset-0 hidden h-full w-full object-cover lg:block"
        />
        <div className="absolute inset-0 hidden bg-[linear-gradient(to_bottom,rgba(30,10,60,0.85)_0%,rgba(30,10,60,0.35)_30%,rgba(30,10,60,0.55)_60%,#1E0A3C_100%)] lg:block" />
        <div className="relative flex items-center gap-2.5">
          <BrandMark className="h-10 w-10" />
          <BrandName />
        </div>
        <div className="relative hidden lg:block">
          <h1 className="font-display text-[44px] font-extrabold leading-[0.95] tracking-[-0.02em] text-white xl:text-[52px]">
            Manage events, ticketing and gate passage.
          </h1>
          <p className="mt-4 max-w-sm text-white/75">Create events, issue tickets and put ticket checkers on the gates.</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="headline text-[40px] leading-none">Sign in</h2>
            <p className="mt-2 text-muted-foreground">Admin accounts only.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                className="h-12 pl-10"
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
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                className="h-12 pl-10"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full rounded-full" loading={loading} disabled={!phone || !password}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
