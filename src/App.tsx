import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { ConfirmProvider } from "@/components/ui";
import { APP_BASE } from "@/lib/api";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Events from "@/pages/Events";
import NewEvent from "@/pages/NewEvent";
import EventDetail from "@/pages/EventDetail";
import Checkers from "@/pages/Checkers";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15_000 } },
});

const routes: Array<[string, JSX.Element]> = [
  ["/", <Dashboard />],
  ["/events", <Events />],
  ["/events/new", <NewEvent />],
  ["/events/:eventId", <EventDetail />],
  ["/users", <Checkers />],
  ["/reports", <Reports />],
  ["/settings", <Settings />],
];

function CheckersRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/users${search}`} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>
          <Toaster position="top-right" richColors closeButton />
          <BrowserRouter basename={APP_BASE}>
            <Routes>
              <Route path="/login" element={<Login />} />
              {routes.map(([path, element]) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute>
                      <Layout>{element}</Layout>
                    </ProtectedRoute>
                  }
                />
              ))}
              {/* "Ticket checkers" is now "Users" */}
              <Route path="/checkers" element={<CheckersRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
