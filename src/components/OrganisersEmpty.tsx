import { Store } from "lucide-react";

/**
 * Organisers sign up on the GatePass site (gatepass-fe) to post events. That site isn't connected to
 * the server yet, so there are no organiser accounts to list. Shown where organisers will appear.
 */
export function OrganisersEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Store className="h-8 w-8 text-faint" strokeWidth={1.5} />
      <p className="font-semibold text-foreground">No organiser accounts yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Organisers sign up on the GatePass site to post their events. They'll show here, with their events and sales, once the site is connected to the server.
      </p>
    </div>
  );
}
