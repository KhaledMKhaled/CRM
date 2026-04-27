import type { DateRange } from "@/hooks/useDateRange";
import { NativeSelect } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function DateRangePicker({
  value,
  onChange,
  presets,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  presets: { key: string; label: string; range: () => DateRange }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        className="w-[180px]"
        onChange={(e) => {
          const p = presets.find((x) => x.key === e.target.value);
          if (p) onChange(p.range());
        }}
        defaultValue=""
      >
        <option value="" disabled>Quick range…</option>
        {presets.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </NativeSelect>
      <Input type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} className="w-[150px]" />
      <span className="text-xs text-[var(--color-muted-fg)]">to</span>
      <Input type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} className="w-[150px]" />
    </div>
  );
}
