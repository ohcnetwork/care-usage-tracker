"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/careui/chart";
import type { HrlTrendPoint } from "@/lib/data";
import { fmtCompact, fmtDate, fmtDateLong } from "@/lib/format";

const config = {
  recordsLinked: { label: "Health records linked", color: "var(--chart-3)" },
  abhasLinked: { label: "ABHAs linked", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function HrlTrendChart({ data, id }: { data: HrlTrendPoint[]; id: string }) {
  return (
    <ChartContainer config={config} className="h-64 w-full sm:h-72">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id={`fill-rec-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-recordsLinked)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-recordsLinked)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`fill-hid-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-abhasLinked)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-abhasLinked)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={48}
          tickFormatter={(v: string) => fmtDate(v)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => fmtCompact(v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                fmtDateLong(String(payload?.[0]?.payload?.date ?? ""))
              }
            />
          }
        />
        <Area
          dataKey="recordsLinked"
          type="monotone"
          fill={`url(#fill-rec-${id})`}
          stroke="var(--color-recordsLinked)"
          strokeWidth={2}
        />
        <Area
          dataKey="abhasLinked"
          type="monotone"
          fill={`url(#fill-hid-${id})`}
          stroke="var(--color-abhasLinked)"
          strokeWidth={2}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
