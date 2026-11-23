import { api, BASE_URL } from "@/lib/api";

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
  endsAt: string | null;
  address: string | null;
  eventType: string | null;
  bannerId: string | null;
  ticketImageId: string | null;
  /** Most tickets that can be issued in total; null = no limit */
  ticketLimit: number | null;
  /** true = the limit can't be changed any more */
  ticketLimitLocked: boolean;
  ticketColor: string;
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
  typeId: string | null;
  /** 0 for complimentary tickets */
  price: number | null;
  /** Given away free (guest, press, sponsor) rather than sold */
  complimentary: boolean;
  /** Who a complimentary ticket is for, or why */
  compNote: string | null;
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
  /** Non-void complimentary tickets (part of `sold`) */
  complimentary: number;
  revenue: number;
  currency: string;
  tiers: Array<{ tier: string; sold: number; checkedIn: number; complimentary: number; revenue: number }>;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: number;
  currency: string;
  /** null = no limit */
  capacity: number | null;
  notes: string | null;
  /** null = the event's ticket colour */
  color: string | null;
  isActive: boolean;
  issued: number;
  /** Non-void complimentary tickets (part of `issued`) */
  complimentary: number;
  checkedIn: number;
  remaining: number | null;
  revenue: number;
}

export type TicketTypeInput = { name: string; price: number; capacity: number | null; notes: string | null; color: string | null };

export interface EventDetailsInput {
  name: string;
  venue: string;
  startsAt: string;
  endsAt: string | null;
  address: string | null;
  eventType: string | null;
  bannerId: string | null;
  ticketLimit: number | null;
  ticketLimitLocked: boolean;
}

export type OrderStatus = "pending" | "paid" | "free" | "failed" | "expired" | "refund_due";

/** A purchase on the GatePass site (Mobile Money through MVend, or free tickets). */
export interface Order {
  code: string;
  eventId: string;
  eventName: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  buyer: { name: string; phone: string; email: string | null };
  lines: Array<{ typeId: string; typeName: string; price: number; quantity: number }>;
  holdUntil: string;
  paidAt: string | null;
  createdAt: string;
  failureReason: string | null;
  tickets: Array<{ ticketId: string; tier: string; holderName: string; price: number | null; status: TicketStatus }>;
  payment?: { provider: string; txref: string | null; wallet: string | null; providerStatus: string | null; providerRef: string | null };
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
  typeId?: string;
  tier?: string;
  holderEmail?: string;
  holderPhone?: string;
  ticketCode?: string;
}

/** Issue a batch free of charge (price 0); `compNote` says who it is for. */
export type CompOptions = { complimentary: true; compNote?: string };

// --- Auth ---
export const login = (phone: string, password: string) =>
  api.post<{ token: string; expiresAt: string; staff: Staff }>("/auth/login", { phone, password }, { quiet: true, auth: false });
export const changeOwnPassword = (currentPassword: string, newPassword: string) =>
  api.post("/auth/change-password", { currentPassword, newPassword });

// --- Dashboard ---
export const getOverview = () => api.get<Overview>("/admin/overview");

/** Transactions. Quiet: the server answers 404 until online payments are switched on. */
export const listOrders = (params: { status?: OrderStatus; eventId?: string; limit?: number; offset?: number }) =>
  api.get<{ orders: Order[]; total: number }>("/admin/orders", params, { quiet: true });

// --- Staff ---
export const listStaff = () => api.get<Staff[]>("/admin/staff");
export const createStaff = (body: { name: string; phone: string; password: string; email?: string; role: Role }) =>
  api.post<Staff>("/admin/staff", body);
export const updateStaff = (
  staffId: string,
  body: Partial<{ name: string; phone: string; email: string | null; password: string; role: Role; isActive: boolean }>
) => api.put<Staff>(`/admin/staff/${staffId}`, body);
/** Remove a user added by mistake. 409 when they've scanned tickets (deactivate them instead). Quiet: the caller explains. */
export const deleteStaff = (staffId: string) => api.del(`/admin/staff/${staffId}`, { quiet: true });
export const listStaffEvents = (staffId: string) => api.get<StaffAssignment[]>(`/admin/staff/${staffId}/events`);

// --- Events ---
export const listEvents = () => api.get<EventSummary[]>("/admin/events");
export const getEvent = (eventId: string) => api.get<EventSummary>(`/admin/events/${eventId}`);
export const createEvent = (body: EventDetailsInput & { gates: string[]; accessCode?: string }) =>
  api.post<EventSummary>("/admin/events", body);
export const updateEvent = (
  eventId: string,
  body: Partial<EventDetailsInput & { isActive: boolean; accessCode: string; ticketColor: string; ticketImageId: string | null }>
) => api.put<EventSummary>(`/admin/events/${eventId}`, body);
/** 409 when the event has tickets (deactivate it instead). Quiet: the caller explains. */
export const deleteEvent = (eventId: string) => api.del(`/admin/events/${eventId}`, { quiet: true });
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
export const listTickets = (
  eventId: string,
  params: { status?: string; search?: string; complimentary?: boolean; limit: number; offset: number }
) => api.get<{ tickets: Ticket[]; total: number }>(`/admin/events/${eventId}/tickets`, params);
export const issueTickets = (eventId: string, tickets: NewTicket[], comp?: CompOptions) =>
  api.post<Ticket[]>(`/admin/events/${eventId}/tickets`, { tickets, ...comp });
export const updateTicket = (code: string, body: Partial<Omit<NewTicket, "ticketCode">>) =>
  api.put<Ticket>(`/admin/tickets/${encodeURIComponent(code)}`, body);
export const voidTicket = (code: string) => api.put<Ticket>(`/admin/tickets/${encodeURIComponent(code)}/void`);
export const resetTicket = (code: string) => api.put<Ticket>(`/admin/tickets/${encodeURIComponent(code)}/reset`);

// --- Scans ---
export const listScans = (eventId: string, params: { outcome?: string; limit: number; offset: number }) =>
  api.get<ScanLog[]>(`/admin/events/${eventId}/scans`, params);

// --- Ticket types ---
export const listTicketTypes = (eventId: string) => api.get<TicketType[]>(`/admin/events/${eventId}/ticket-types`);
export const createTicketType = (eventId: string, body: TicketTypeInput) =>
  api.post<TicketType>(`/admin/events/${eventId}/ticket-types`, body);
export const updateTicketType = (eventId: string, typeId: string, body: Partial<TicketTypeInput & { isActive: boolean }>) =>
  api.put<TicketType>(`/admin/events/${eventId}/ticket-types/${typeId}`, body);
export const deleteTicketType = (eventId: string, typeId: string) => api.del(`/admin/events/${eventId}/ticket-types/${typeId}`);

// --- Images (event banners, ticket artwork) ---
export const uploadImage = (dataUrl: string) =>
  api.post<{ id: string; url: string; contentType: string; size: number }>("/admin/media", { data: dataUrl });
/** Absolute URL of an uploaded image. */
export const mediaUrl = (id: string | null | undefined) => (id ? `${BASE_URL}/media/${id}` : null);
