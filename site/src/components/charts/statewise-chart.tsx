"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/careui/chart";
import type { StatewiseRow } from "@/lib/data";
import { fmtCompact } from "@/lib/format";

const config = {
  value: { label: "Total", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function StatewiseChart({ data, top = 12 }: { data: StatewiseRow[]; top?: number }) {
  const rows = [...data]
    .filter((r) => r.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, top)
    .map((r) => ({ name: r.state, value: r.value }));

  return (
    <ChartContainer config={config} className="w-full" style={{ height: rows.length * 34 + 30 }}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 44 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={170}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[3, 6, 6, 3]}
          barSize={20}
          label={{
            position: "right",
            fontSize: 11,
            fill: "var(--muted-foreground)",
            formatter: (v: unknown) => fmtCompact(Number(v)),
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}
