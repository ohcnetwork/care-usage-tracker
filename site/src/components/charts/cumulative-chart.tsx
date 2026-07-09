"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/careui/chart";
import type { TrendPoint } from "@/lib/data";
import { fmtCompact, fmtDate, fmtDateLong } from "@/lib/format";

export function CumulativeChart({
  data,
  id,
  label,
}: {
  data: TrendPoint[];
  id: string;
  label: string;
}) {
  const config = {
    value: { label, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-64 w-full sm:h-80">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={64}
          tickFormatter={(v: string) => fmtDate(v)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
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
          dataKey="value"
          type="monotone"
          fill={`url(#fill-${id})`}
          stroke="var(--color-value)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
