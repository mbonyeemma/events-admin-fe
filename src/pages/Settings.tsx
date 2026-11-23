import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/Layout";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { changeOwnPassword } from "@/services/admin";
import { formatPhone } from "@/lib/utils";

/** The signed-in admin's account: details, password and signing out. */
export default function Settings() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const mismatch = repeat.length > 0 && repeat !== next;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("New password must be at least 8 characters.");
    if (next !== repeat) return toast.error("The new passwords don't match.");
    setSaving(true);
    try {
      await changeOwnPassword(current, next);
      toast.success("Password changed.");
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader kicker="Your account" title="Settings" />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-faint" /> Change password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="max-w-md space-y-4">
              <Field label="Current password">
                <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </Field>
              <Field label="New password" hint="At least 8 characters.">
                <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
              </Field>
              <Field label="New password again" hint={mismatch ? <span className="text-destructive">Doesn't match the new password.</span> : undefined}>
                <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
              </Field>
              <Button type="submit" className="rounded-full px-6" loading={saving} disabled={!current || !next || !repeat || mismatch}>
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-center gap-4">
                <Avatar name={admin?.name ?? ""} className="h-14 w-14 text-base" />
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-bold text-foreground">{admin?.name}</p>
                  <p className="text-sm text-muted-foreground">{formatPhone(admin?.phone)}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="solid">Admin</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">To change your name or phone number, ask another admin to edit you under Users.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 pt-5 sm:pt-6">
              <div>
                <p className="font-semibold text-foreground">Sign out</p>
                <p className="text-sm text-muted-foreground">On this device.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
