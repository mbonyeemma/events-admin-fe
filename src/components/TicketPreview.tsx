import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { drawTicket, type TicketArt } from "@/lib/ticketArt";

/** Live picture of a ticket: the same drawing that "Download ticket" saves. */
export function TicketPreview({ art, className }: { art: TicketArt; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(art);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (canvas.current && !cancelled) drawTicket(canvas.current, art).catch(() => undefined);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <canvas
      ref={canvas}
      className={cn("h-auto w-full max-w-[300px] rounded-2xl", className)}
      aria-label={`${art.complimentary ? "Complimentary ticket" : "Ticket"} preview for ${art.eventName}`}
    />
  );
}
