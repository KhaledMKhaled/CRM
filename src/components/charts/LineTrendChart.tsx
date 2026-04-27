import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export function LineTrendChart({
  data,
  xKey,
  series,
  height = 280,
  yFormatter,
}: {
  data: any[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 16% 90%)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} tickLine={false} tickFormatter={yFormatter} width={70} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 31% 91%)", fontSize: 12 }}
          formatter={(v: number) => (yFormatter ? yFormatter(v) : v)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
