"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/careui/chart";
import type { QuarterRow } from "@/lib/data";
import { fmtCompact } from "@/lib/format";

const config = {
  q1: { label: "Q1 (Apr–Jun)", color: "var(--chart-2)" },
  q2: { label: "Q2 (Jul–Sep)", color: "var(--chart-1)" },
  q3: { label: "Q3 (Oct–Dec)", color: "var(--chart-3)" },
  q4: { label: "Q4 (Jan–Mar)", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function QuarterlyChart({ data }: { data: QuarterRow[] }) {
  const rows = data
    .filter((r) => r.fyStartYear != null)
    .map((r) => ({ ...r, fy: `FY ${r.fyStartYear}–${String((r.fyStartYear ?? 0) + 1).slice(2)}` }));

  return (
    <ChartContainer config={config} className="h-64 w-full sm:h-72">
      <BarChart data={rows} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="fy" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => fmtCompact(v)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="q1" fill="var(--color-q1)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="q2" fill="var(--color-q2)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="q3" fill="var(--color-q3)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="q4" fill="var(--color-q4)" radius={[3, 3, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
