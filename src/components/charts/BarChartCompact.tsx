import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function BarChartCompact({
  data,
  xKey,
  bars,
  height = 280,
  yFormatter,
}: {
  data: any[];
  xKey: string;
  bars: { key: string; label: string; color: string }[];
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 16% 90%)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} tickLine={false} tickFormatter={yFormatter} width={70} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 31% 91%)", fontSize: 12 }}
          formatter={(v: number) => (yFormatter ? yFormatter(v) : v)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
