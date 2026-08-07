import { useMemo, useState } from "react";
import { BellRing, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Race } from "@/lib/f1";

/**
 * Lightweight, no-backend reminders: a browser notification scheduled while the
 * app stays open, plus a calendar file everyone can add on any device.
 */
export function RaceReminder({ race }: { race: Race }) {
  const [armed, setArmed] = useState(false);

  const lockTime = useMemo(() => new Date(race.race_start), [race.race_start]);

  const remindMe = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.info("This device can't do pop-up reminders — try the calendar reminder instead.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.info("No worries — use the calendar reminder instead.");
      return;
    }
    const msAhead = lockTime.getTime() - Date.now() - 60 * 60 * 1000;
    window.setTimeout(
      () => {
        new Notification("Picks close soon! 🏁", {
          body: `${race.name} starts in an hour — get your picks in.`,
        });
      },
      Math.max(1000, msAhead),
    );
    setArmed(true);
    toast.success("Reminder set — we'll nudge you an hour before lights out.");
  };

  const addToCalendar = () => {
    const start = new Date(lockTime.getTime() - 60 * 60 * 1000);
    const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Friendly Family Competition//EN",
      "BEGIN:VEVENT",
      `UID:picks-${race.id}@f1-family`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(lockTime)}`,
      `SUMMARY:Make your F1 picks — ${race.name}`,
      `DESCRIPTION:Picks lock when the race starts. Head to the family predictor and lock yours in.`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Make your F1 picks",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `picks-${race.id}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar reminder downloaded — open it to add it.");
  };

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-secondary/30 px-3 py-3">
      <p className="mr-auto text-sm text-muted-foreground">
        Easy to forget? Get a nudge before picks lock.
      </p>
      <Button variant="secondary" size="sm" onClick={remindMe} disabled={armed}>
        <BellRing className="size-4" /> {armed ? "Reminder on" : "Remind me"}
      </Button>
      <Button variant="ghost" size="sm" onClick={addToCalendar}>
        <CalendarPlus className="size-4" /> Add to calendar
      </Button>
    </div>
  );
}
