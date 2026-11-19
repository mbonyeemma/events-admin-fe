import { api } from "@/lib/api";

// Types mirror api/src/types/index.ts.

export type Role = "ticket_checker" | "admin";
export type TicketStatus = "valid" | "used" | "void";
export type ScanOutcome = "valid" | "used" | "invalid";

export interface Staff {
  staffId: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  assignmentCount?: number;
}

export interface Gate {
  id: string;
  label: string;
}

export interface EventSummary {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  gates: Gate[];
  ticketCount: number;
  admittedCount: number;
  isActive: boolean;
  accessCode?: string | null;
  checkerCount?: number;
}

export interface Assignment {
  staffId: string;
  name: string;
  phone: string | null;
  email: string | null;
  gateId: string | null;
  gateLabel: string | null;
}

export interface StaffAssignment {
  eventId: string;
  eventName: string;
  venue: string;
  startsAt: string;
  isActive: boolean;
  gateId: string | null;
  gateLabel: string | null;
}

export interface Ticket {
  ticketId: string;
  eventId: string;
  holderName: string;
  holderEmail: string | null;
  holderPhone: string | null;
  tier: string;
  status: TicketStatus;
  scannedAt: string | null;
  scannedGate: string | null;
  scannedBy: string | null;
  scannedByName: string | null;
}

export interface ScanLog {
  id: number;
  ticketId: string;
  holderName: string | null;
  tier: string | null;
  gate: string | null;
  staffId: string;
  staffName: string;
  outcome: ScanOutcome;
  message: string;
  method: "scan" | "manual" | "list";
  createdAt: string;
}

export interface EventStats {
  sold: number;
  checkedIn: number;
  notCheckedIn: number;
  voided: number;
  tiers: Array<{ tier: string; sold: number; checkedIn: number }>;
}

export interface Overview {
  events: { total: number; upcoming: number };
  tickets: { issued: number; checkedIn: number };
  checkers: { total: number; active: number };
  today: { scans: number; admitted: number; rejected: number };
  recentScans: Array<ScanLog & { eventId: string; eventName: string }>;
}

export interface NewTicket {
  holderName: string;
  tier?: string;
  holderEmail?: string;
  holderPhone?: string;
  ticketCode?: string;
}

// --- Auth ---
export const login = (phone: string, password: string) =>
  api.post<{ token: string; expiresAt: string; staff: Staff }>("/auth/login", { phone, password }, { quiet: true, auth: false });
export const changeOwnPassword = (currentPassword: string, newPassword: string) =>
  api.post("/auth/change-password", { currentPassword, newPassword });

// --- Dashboard ---
export const getOverview = () => api.get<Overview>("/admin/overview");

// --- Staff ---
export const listStaff = () => api.get<Staff[]>("/admin/staff");
export const createStaff = (body: { name: string; phone: string; password: string; email?: string; role: Role }) =>
  api.post<Staff>("/admin/staff", body);
export const updateStaff = (
  staffId: string,
  body: Partial<{ name: string; phone: string; email: string | null; password: string; role: Role; isActive: boolean }>
) => api.put<Staff>(`/admin/staff/${staffId}`, body);
export const listStaffEvents = (staffId: string) => api.get<StaffAssignment[]>(`/admin/staff/${staffId}/events`);

// --- Events ---
export const listEvents = () => api.get<EventSummary[]>("/admin/events");
export const getEvent = (eventId: string) => api.get<EventSummary>(`/admin/events/${eventId}`);
export const createEvent = (body: { name: string; venue: string; startsAt: string; gates: string[]; accessCode?: string }) =>
  api.post<EventSummary>("/admin/events", body);
export const updateEvent = (
  eventId: string,
  body: Partial<{ name: string; venue: string; startsAt: string; isActive: boolean; accessCode: string }>
) => api.put<EventSummary>(`/admin/events/${eventId}`, body);
export const deleteEvent = (eventId: string) => api.del(`/admin/events/${eventId}`);
export const getEventStats = (eventId: string) => api.get<EventStats>(`/admin/events/${eventId}/stats`);

// --- Gates ---
export const addGate = (eventId: string, label: string) => api.post<EventSummary>(`/admin/events/${eventId}/gates`, { label });
export const renameGate = (eventId: string, gateId: string, label: string) =>
  api.put<EventSummary>(`/admin/events/${eventId}/gates/${gateId}`, { label });
export const removeGate = (eventId: string, gateId: string) => api.del<EventSummary>(`/admin/events/${eventId}/gates/${gateId}`);

// --- Assignments ---
export const listAssignments = (eventId: string) => api.get<Assignment[]>(`/admin/events/${eventId}/staff`);
export const assignStaff = (eventId: string, staffId: string, gateId: string | null) =>
  api.put<Assignment[]>(`/admin/events/${eventId}/staff/${staffId}`, { gateId });
export const unassignStaff = (eventId: string, staffId: string) => api.del<Assignment[]>(`/admin/events/${eventId}/staff/${staffId}`);

// --- Tickets ---
export const listTickets = (eventId: string, params: { status?: string; search?: string; limit: number; offset: number }) =>
  api.get<{ tickets: Ticket[]; total: number }>(`/admin/events/${eventId}/tickets`, params);
export const issueTickets = (eventId: string, tickets: NewTicket[]) =>
  api.post<Ticket[]>(`/admin/events/${eventId}/tickets`, { tickets });
export const updateTicket = (code: string, body: Partial<Omit<NewTicket, "ticketCode">>) =>
  api.put<Ticket>(`/admin/tickets/${encodeURIComponent(code)}`, body);
export const voidTicket = (code: string) => api.put<Ticket>(`/admin/tickets/${encodeURIComponent(code)}/void`);
export const resetTicket = (code: string) => api.put<Ticket>(`/admin/tickets/${encodeURIComponent(code)}/reset`);

// --- Scans ---
export const listScans = (eventId: string, params: { outcome?: string; limit: number; offset: number }) =>
  api.get<ScanLog[]>(`/admin/events/${eventId}/scans`, params);
