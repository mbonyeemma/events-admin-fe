import QRCode from "qrcode";
import { formatMoney, loadImage } from "@/lib/utils";

export interface TicketArt {
  eventName: string;
  startsAt: string;
  endsAt?: string | null;
  venue: string;
  address?: string | null;
  holderName: string;
  typeName: string;
  price: number | null;
  /** Complimentary ticket: "COMPLIMENTARY" is printed where the price goes. */
  complimentary?: boolean;
  currency: string;
  code: string;
  /** Band colour: the ticket type's colour, else the event's ticket colour. */
  color: string;
  /** Ticket image, else the event banner; null = colour only. */
  imageUrl: string | null;
}

export const TICKET_W = 1080;
export const TICKET_H = 1920;
const PAGE = "#F1EEF7";
const INK = "#1E0A3C";
const MUTED = "#6F7287";
const FONT = '"Inter Tight", system-ui, sans-serif';

/** White or dark text, whichever reads better on `hex`. */
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? INK : "#FFFFFF";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wrap `text` into at most `maxLines` lines no wider than `width`; the last line gets an ellipsis. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    return [...lines.slice(0, maxLines - 1), `${last}…`];
  }
  return lines;
}

function when(t: TicketArt) {
  const start = new Date(t.startsAt);
  const day = start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return t.endsAt ? `${day} · ${time(start)} – ${time(new Date(t.endsAt))}` : `${day} · ${time(start)}`;
}

/** Draw a phone-sized ticket (1080 × 1920) onto `canvas`. */
export async function drawTicket(canvas: HTMLCanvasElement, t: TicketArt) {
  await Promise.all([document.fonts.load(`900 72px ${FONT}`), document.fonts.load(`600 40px ${FONT}`), document.fonts.load(`400 36px ${FONT}`)]).catch(
    () => undefined
  );
  const image = t.imageUrl ? await loadImage(t.imageUrl).catch(() => null) : null;
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, t.code, { margin: 0, width: 460, color: { dark: INK, light: "#FFFFFF" }, errorCorrectionLevel: "M" });

  canvas.width = TICKET_W;
  canvas.height = TICKET_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, TICKET_W, TICKET_H);

  const x = 60;
  const y = 60;
  const w = TICKET_W - 120;
  const h = TICKET_H - 120;
  ctx.save();
  ctx.shadowColor = "rgba(30,10,60,0.12)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, x, y, w, h, 48);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, 48);
  ctx.clip();

  // Header image (cover), or the colour when there is none.
  const imgH = 500;
  if (image) {
    const scale = Math.max(w / image.width, imgH / image.height);
    const iw = image.width * scale;
    const ih = image.height * scale;
    ctx.drawImage(image, x + (w - iw) / 2, y + (imgH - ih) / 2, iw, ih);
  } else {
    ctx.fillStyle = t.color;
    ctx.fillRect(x, y, w, imgH);
  }

  // Colour band: event, date, venue.
  const bandY = y + imgH;
  const bandH = 400;
  const ink = inkOn(t.color);
  ctx.fillStyle = t.color;
  ctx.fillRect(x, bandY, w, bandH);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.75;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText("LYXA EVENTS", x + 60, bandY + 70);
  ctx.globalAlpha = 1;
  ctx.font = `900 76px ${FONT}`;
  const title = wrap(ctx, t.eventName, w - 120, 2);
  title.forEach((line, i) => ctx.fillText(line, x + 60, bandY + 150 + i * 84));
  const after = bandY + 150 + title.length * 84;
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText(when(t), x + 60, after + 10);
  ctx.globalAlpha = 0.8;
  ctx.font = `400 34px ${FONT}`;
  ctx.fillText(wrap(ctx, [t.venue, t.address].filter(Boolean).join(", "), w - 120, 1)[0], x + 60, after + 60);
  ctx.globalAlpha = 1;

  // Ticket type, price and holder.
  const infoY = bandY + bandH + 70;
  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.arc(x + 76, infoY - 14, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `900 56px ${FONT}`;
  ctx.fillText(wrap(ctx, t.typeName, w - 520, 1)[0], x + 110, infoY + 6);
  if (t.complimentary) {
    // Shrink to fit beside the type name (which gets at most w - 520).
    let size = 44;
    do {
      ctx.font = `900 ${size}px ${FONT}`;
      size -= 2;
    } while (ctx.measureText("COMPLIMENTARY").width > 330 && size >= 24);
    ctx.textAlign = "right";
    ctx.fillText("COMPLIMENTARY", x + w - 60, infoY + 4);
    ctx.textAlign = "left";
  } else if (t.price !== null) {
    ctx.font = `700 44px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(t.price === 0 ? "Free" : formatMoney(t.price, t.currency), x + w - 60, infoY + 4);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = MUTED;
  ctx.font = `400 32px ${FONT}`;
  ctx.fillText("Admit", x + 60, infoY + 90);
  ctx.fillStyle = INK;
  ctx.font = `700 42px ${FONT}`;
  ctx.fillText(wrap(ctx, t.holderName, w - 240, 1)[0], x + 170, infoY + 92);

  // Perforation: dashes between notches.
  const perfY = infoY + 170;
  ctx.strokeStyle = "#D9D5E3";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  ctx.moveTo(x + 60, perfY);
  ctx.lineTo(x + w - 60, perfY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  ctx.fillStyle = PAGE;
  for (const cx of [x, x + w]) {
    ctx.beginPath();
    ctx.arc(cx, perfY, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  // QR stub.
  const qrY = perfY + 70;
  ctx.drawImage(qr, (TICKET_W - 460) / 2, qrY, 460, 460);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(t.code.split("").join(String.fromCharCode(8202)), TICKET_W / 2, qrY + 540);
  ctx.textAlign = "left";
}

export async function ticketPng(t: TicketArt): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await drawTicket(canvas, t);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the ticket."))), "image/png"));
}
