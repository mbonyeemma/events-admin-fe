import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui";
import { EventForm, emptyEvent, formToInput, validateEvent, type EventFormValues } from "@/components/EventForm";
import { createEvent } from "@/services/admin";

/** Creating an event: its own page (details, banner, tickets, gates), then on to the new event. */
export default function NewEvent() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [values, setValues] = useState<EventFormValues>(emptyEvent);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const error = validateEvent(values, true);
    if (error) return toast.error(error);
    setSaving(true);
    try {
      const res = await createEvent({
        ...formToInput(values),
        gates: values.gates,
        ...(values.accessCode ? { accessCode: values.accessCode } : {}),
      });
      toast.success("Event created. Add ticket types next.");
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      navigate(`/events/${res.data!.id}`, { replace: true });
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Events
      </Link>
      <div className="mt-4">
        <PageHeader title="New event" description="Ticket types, prices and ticket checkers come next, on the event's page." />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <EventForm values={values} onChange={setValues} creating layout="page" />

        {/* Stays in view at the bottom while you fill in the form */}
        <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-end gap-2 rounded-2xl bg-white/95 p-3 shadow-pop backdrop-blur">
          <Button variant="outline" onClick={() => navigate("/events")}>
            Cancel
          </Button>
          <Button type="submit" className="px-6" loading={saving}>
            Create event
          </Button>
        </div>
      </form>
    </div>
  );
}
