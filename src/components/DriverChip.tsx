import { teamColor } from "@/lib/team-colors";
import type { Driver } from "@/lib/f1";

/**
 * A driver's three-letter code paired with their team colour and full name so
 * nobody has to memorise "ALB" or "LEC".
 */
export function DriverChip({
  driver,
  selected = false,
  showName = true,
}: {
  driver: Driver;
  selected?: boolean;
  showName?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-6 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: teamColor(driver.team_id) }}
      />
      <span className="flex flex-col items-start leading-tight">
        <span className="font-display text-base tracking-wide">{driver.code}</span>
        {showName && (
          <span className={`text-[11px] ${selected ? "opacity-90" : "text-muted-foreground"}`}>
            {driver.full_name}
          </span>
        )}
      </span>
    </span>
  );
}

export function DriverDot({ driver }: { driver: Driver | undefined }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 shrink-0 rounded-full align-middle"
      style={{ backgroundColor: teamColor(driver?.team_id) }}
    />
  );
}
