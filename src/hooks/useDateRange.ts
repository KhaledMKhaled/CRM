import { useState } from "react";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function defaultQ2_2026() {
  return { from: "2026-04-01", to: "2026-06-30" };
}

export type DateRange = { from: string; to: string };

const PRESETS: { key: string; label: string; range: () => DateRange }[] = [
  { key: "q2", label: "Q2 2026 (Apr–Jun)", range: () => ({ from: "2026-04-01", to: "2026-06-30" }) },
  { key: "apr", label: "April 2026", range: () => ({ from: "2026-04-01", to: "2026-04-30" }) },
  { key: "may", label: "May 2026", range: () => ({ from: "2026-05-01", to: "2026-05-31" }) },
  { key: "jun", label: "June 2026", range: () => ({ from: "2026-06-01", to: "2026-06-30" }) },
  { key: "last30", label: "Last 30 days", range: () => {
    const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 30);
    return { from: fmt(from), to: fmt(to) };
  } },
];

export function useDateRange(initial?: DateRange) {
  const [range, setRange] = useState<DateRange>(initial ?? defaultQ2_2026());
  return { range, setRange, presets: PRESETS };
}
