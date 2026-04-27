// Donut/Pie chart for channel distribution
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = [
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(265 85% 58%)",
  "hsl(350 89% 60%)",
  "hsl(170 80% 42%)",
  "hsl(25 95% 55%)",
];

interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function DonutChart({ data, height = 280 }: DonutChartProps) {
  const nonZero = data.filter((d) => d.value > 0);
  if (nonZero.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--color-muted-fg)]">
        No data for this period
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={nonZero}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
        >
          {nonZero.map((_entry, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => v.toLocaleString()}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
