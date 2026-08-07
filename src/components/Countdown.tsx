import { useEffect, useState } from "react";
import { Flag } from "lucide-react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function Countdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = now === null ? null : new Date(target).getTime() - now;

  if (diff === null) {
    if (compact) return <span className="tnum text-sm text-muted-foreground">--d --h --m</span>;
    return (
      <div className="flex gap-2 sm:gap-3">
        {["days", "hrs", "min", "sec"].map((label) => (
          <div
            key={label}
            className="min-w-16 flex-1 rounded-xl border border-border bg-secondary/60 px-2 py-3 text-center sm:min-w-20"
          >
            <div className="tnum font-display text-3xl leading-none text-muted-foreground sm:text-4xl">--</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    );
  }

  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-2 font-display text-2xl text-accent">
        <Flag className="size-5" aria-hidden="true" /> Lights out — picks are locked
      </span>
    );
  }

  const { days, hours, minutes, seconds } = parts(diff);

  if (compact) {
    return (
      <span className="tnum text-sm text-muted-foreground">
        {days}d {hours}h {minutes}m
      </span>
    );
  }

  const cells: Array<[number, string]> = [
    [days, "days"],
    [hours, "hrs"],
    [minutes, "min"],
    [seconds, "sec"],
  ];

  return (
    <div className="flex gap-2 sm:gap-3">
      {cells.map(([value, label]) => (
        <div
          key={label}
          className="min-w-16 flex-1 rounded-xl border border-border bg-secondary/60 px-2 py-3 text-center sm:min-w-20"
        >
          <div className="tnum font-display text-3xl leading-none text-foreground sm:text-4xl">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}
