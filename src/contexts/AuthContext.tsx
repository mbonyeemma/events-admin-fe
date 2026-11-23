import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearToken, getToken, setToken } from "@/lib/api";
import { login as loginApi, type Staff } from "@/services/admin";

interface AuthState {
  admin: Staff | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const PROFILE_KEY = "lyxa_admin_profile";

function readProfile(): Staff | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const stored = raw ? (JSON.parse(raw) as Staff & { expiresAt?: string }) : null;
    if (!stored || !getToken()) return null;
    if (stored.expiresAt && new Date(stored.expiresAt).getTime() < Date.now()) {
      clearToken();
      localStorage.removeItem(PROFILE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Staff | null>(readProfile);

  const value = useMemo<AuthState>(
    () => ({
      admin,
      isAuthenticated: !!admin && !!getToken(),
      login: async (phone, password) => {
        const res = await loginApi(phone, password);
        const data = res.data!;
        // Ticket checkers use the mobile app; only admins manage events here.
        if (data.staff.role !== "admin") {
          throw new Error("This account is a ticket checker. Use the GatePass app to scan tickets.");
        }
        setToken(data.token);
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...data.staff, expiresAt: data.expiresAt }));
        setAdmin(data.staff);
      },
      logout: () => {
        clearToken();
        localStorage.removeItem(PROFILE_KEY);
        setAdmin(null);
      },
    }),
    [admin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
