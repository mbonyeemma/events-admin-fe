import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString();
}

/** "1 checker", "3 checkers" */
export const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? `Today, ${formatTime(d)}` : `${formatDate(d)}, ${formatTime(d)}`;
}

export type EventPhase = "live" | "today" | "upcoming" | "past";

/** Same rule as the app: doors open 3 h before the start, the event runs for 8 h after it. */
export function eventPhase(iso: string, now = new Date()): EventPhase {
  const start = new Date(iso).getTime();
  const t = now.getTime();
  if (t >= start - 3 * 3600_000 && t <= start + 8 * 3600_000) return "live";
  if (t > start + 8 * 3600_000) return "past";
  return new Date(iso).toDateString() === now.toDateString() ? "today" : "upcoming";
}

/** <input type="datetime-local"> value in local time. */
export function toLocalInput(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "+256772123456" → "+256 772 123 456" */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const m = phone.match(/^\+(256)(\d{3})(\d{3})(\d{3})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** Readable random password (no look-alike characters). */
export function generatePassword(length = 10): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((word) => word.match(/\p{L}/u)?.[0])
    .filter((c): c is string => !!c);
  return ((letters[0] ?? "") + (letters.length > 1 ? letters[letters.length - 1] : "")).toUpperCase() || "?";
}

export function copyText(text: string) {
  return navigator.clipboard?.writeText(text);
}

/** Minimal CSV: commas, quotes and new lines inside quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some(Boolean));
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export function download(filename: string, content: string | Blob, type = "text/csv") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "UGX 200,000" */
export function formatMoney(amount: number | null | undefined, currency = "UGX"): string {
  if (amount === null || amount === undefined) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** RWF 1.9M, UGX 250K: short enough for a stat card. */
export function compactMoney(amount: number | null | undefined, currency = "UGX"): string {
  if (amount === null || amount === undefined) return "—";
  const trim = (n: number) => (Math.round(n * 10) / 10).toString();
  if (amount >= 1_000_000) return `${currency} ${trim(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `${currency} ${trim(amount / 1_000)}K`;
  return `${currency} ${amount}`;
}

/** "200k" → 200000, "1.5m" → 1500000, "700,000" → 700000. null when it isn't an amount. */
export function parseAmount(text: string): number | null {
  const m = text.trim().toLowerCase().replace(/[,\s]/g, "").replace(/^ugx/, "").match(/^(\d+(?:\.\d+)?)([km]?)$/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export const EVENT_TYPES = [
  "Concert",
  "Party",
  "Festival",
  "Comedy",
  "Conference",
  "Seminar or talk",
  "Workshop",
  "Sports",
  "Exhibition",
  "Church event",
  "Gala or dinner",
  "Other",
];

export const TICKET_COLORS = ["#1E0A3C", "#7C3AED", "#2563EB", "#0E9F6E", "#C9A227", "#E8590C", "#E03E3E", "#111827"];

/**
 * Read an image file as a data URL ready to upload: photos are scaled to at most `maxWidth`
 * and saved as JPEG; small PNGs keep their transparency.
 */
export async function prepareImage(file: File, maxWidth = 1600): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPEG, PNG or WebP image.");
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read the image."));
    reader.readAsDataURL(file);
  });
  const img = await loadImage(original);
  if (file.type === "image/png" && img.width <= maxWidth && file.size <= 1_500_000) return original;
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the image."));
    img.src = src;
  });
}
