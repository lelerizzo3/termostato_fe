export const MONITOR_MAX_W = 2000;
export const MONITOR_GREEN_W = 100;

export function monitorColor(watts: number | null | undefined): string {
  if (watts === null || watts === undefined) return '#334155';
  if (watts <= MONITOR_GREEN_W) return '#22c55e';
  if (watts >= MONITOR_MAX_W) return '#ef4444';
  const t = (watts - MONITOR_GREEN_W) / (MONITOR_MAX_W - MONITOR_GREEN_W);
  const hue = Math.round(120 - 120 * t);
  return `hsl(${hue}, 85%, 50%)`;
}

export function barHeightWatts(watts: number | null | undefined): number {
  if (watts === null || watts === undefined) return 0;
  return Math.min(watts, MONITOR_MAX_W);
}