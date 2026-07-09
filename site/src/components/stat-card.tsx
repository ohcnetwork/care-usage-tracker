"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart } from "recharts";
import { Card, CardContent } from "@/components/careui/card";
import { Badge } from "@/components/careui/badge";
import { ChartContainer, type ChartConfig } from "@/components/careui/chart";
import type { TrendPoint } from "@/lib/data";
import { fmtCompact, fmtIN, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const sparkConfig = {
  value: { label: "", color: "var(--primary-600)" },
} satisfies ChartConfig;

export function StatCard({
  title,
  icon: Icon,
  total,
  today,
  last30d,
  weekGrowthPct,
  sparkline,
  sparklineId,
  accent = false,
}: {
  title: string;
  icon: LucideIcon;
  total: number | null;
  today?: number | null;
  last30d?: number | null;
  /** 7-day vs previous 7-day growth %; null hides the badge. */
  weekGrowthPct?: number | null;
  /** 30-day daily series rendered as a background sparkline. */
  sparkline?: TrendPoint[];
  sparklineId?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        accent &&
          "border-primary-200 bg-gradient-to-br from-primary-50/80 via-card to-card dark:border-primary-900 dark:from-primary-950/40",
      )}
    >
      {sparkline && sparkline.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-50">
          <ChartContainer config={sparkConfig} className="h-full w-full">
            <AreaChart data={sparkline} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={`spark-${sparklineId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="monotone"
                fill={`url(#spark-${sparklineId})`}
                stroke="var(--color-value)"
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
      <CardContent className="relative flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-soft-foreground">
          <Icon className="size-4" aria-hidden />
          {title}
          {weekGrowthPct != null && (
            <Badge
              variant={weekGrowthPct >= 0 ? "success" : "warning"}
              className="ml-auto gap-1 tabular-nums"
              title="Last 7 days vs previous 7 days"
            >
              {weekGrowthPct >= 0 ? (
                <TrendingUp className="size-3" aria-hidden />
              ) : (
                <TrendingDown className="size-3" aria-hidden />
              )}
              {fmtSignedPct(weekGrowthPct)}
            </Badge>
          )}
        </div>
        <div>
          <div
            className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl"
            title={fmtIN(total)}
          >
            {fmtCompact(total)}
          </div>
          <div className="mt-0.5 text-xs text-placeholder-foreground tabular-nums">
            {fmtIN(total)}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {today != null && (
            <Badge variant="primary" className="tabular-nums">
              +{fmtCompact(today)} today
            </Badge>
          )}
          {last30d != null && (
            <Badge variant="neutral" className="tabular-nums">
              +{fmtCompact(last30d)} last 30 days
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
