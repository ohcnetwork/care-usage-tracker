"use client";

import { useMemo } from "react";
import { FileHeart, Gauge, IdCard, Layers, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/careui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/careui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/careui/tabs";
import { StatCard } from "@/components/abdm/stat-card";
import { AbhaTrendChart } from "@/components/abdm/charts/abha-trend-chart";
import { HrlTrendChart } from "@/components/abdm/charts/hrl-trend-chart";
import { CumulativeChart } from "@/components/abdm/charts/cumulative-chart";
import { StatewiseChart } from "@/components/abdm/charts/statewise-chart";
import { partners, partnerTrends, summary } from "@/lib/abdm/data";
import { fmtCompact, fmtRate } from "@/lib/format";

const partnerChartConfig = {
  value: { label: "Total", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function Overview() {
  const combined = partnerTrends.combined;

  const topPartnersAbha = useMemo(
    () =>
      [...partners.abha.national]
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .map((r) => ({ name: r.name, value: r.value })),
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          ABDM adoption — tracked partners
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-soft-foreground">
          ABHA identities created and health records linked by the{" "}
          {summary.partnersTracked} partners we track, mirrored from the
          official NHA dashboard.
        </p>
      </div>

      {/* Headline stats — all figures are sums over tracked partners only */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard
          title="ABHA numbers created"
          icon={IdCard}
          total={summary.abha.total}
          today={summary.abha.today}
          last30d={summary.abha.last30d}
          weekGrowthPct={summary.abha.weekGrowthPct}
          sparkline={combined.abhaDaily}
          sparklineId="abha"
          accent
        />
        <StatCard
          title="Health records linked"
          icon={FileHeart}
          total={summary.hrl.total}
          today={summary.hrl.today}
          last30d={summary.hrl.last30d}
          weekGrowthPct={summary.hrl.weekGrowthPct}
          sparkline={combined.hrlDaily.map((p) => ({ date: p.date, value: p.recordsLinked }))}
          sparklineId="hrl"
          accent
        />
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InsightCard
          icon={Users}
          title="Active partners"
          value={`${summary.activePartners7d} of ${summary.partnersTracked}`}
          detail={`active this week · ${summary.activePartners30d} of ${summary.partnersTracked} in the last 30 days, across ${summary.statesActive} states`}
        />
        <InsightCard
          icon={Gauge}
          title="Daily run-rate"
          value={fmtRate(summary.abha.perDay7d).replace("~", "~") + " ABHAs"}
          detail={`7-day average · records linked at ${fmtRate(summary.hrl.perDay7d)} (30-day: ${fmtRate(
            summary.hrl.perDay30d,
          )})`}
        />
        <InsightCard
          icon={Layers}
          title="Linkage depth"
          value={
            summary.linkageDepth30d != null
              ? `${summary.linkageDepth30d.toLocaleString("en-IN", { maximumFractionDigits: 2 })}×`
              : "—"
          }
          detail={
            "records linked per ABHA (30 days)" +
            (summary.partnerLinkageDepth[0]
              ? ` · deepest: ${summary.partnerLinkageDepth[0].name} at ${summary.partnerLinkageDepth[0].depth.toLocaleString("en-IN", { maximumFractionDigits: 1 })}×`
              : "")
          }
        />
      </div>

      {/* Combined trends across tracked partners */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ABHA creation trend</CardTitle>
            <CardDescription>All tracked partners combined</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="mb-3">
                <TabsTrigger value="daily">Last 30 days</TabsTrigger>
                <TabsTrigger value="all">Full history (weekly)</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                <AbhaTrendChart data={combined.abhaDaily} id="abha-daily" />
              </TabsContent>
              <TabsContent value="all">
                <AbhaTrendChart data={combined.abhaWeeklyAll} id="abha-all" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health records linked trend</CardTitle>
            <CardDescription>All tracked partners combined</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="mb-3">
                <TabsTrigger value="daily">Last 30 days</TabsTrigger>
                <TabsTrigger value="all">Full history (weekly)</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                <HrlTrendChart data={combined.hrlDaily} id="hrl-daily" />
              </TabsContent>
              <TabsContent value="all">
                <HrlTrendChart data={combined.hrlWeeklyAll} id="hrl-all" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative growth */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative growth</CardTitle>
          <CardDescription>
            Running totals across tracked partners, from weekly history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hrl">
            <TabsList className="mb-3">
              <TabsTrigger value="hrl">Health records linked</TabsTrigger>
              <TabsTrigger value="abha">ABHAs created</TabsTrigger>
            </TabsList>
            <TabsContent value="hrl">
              <CumulativeChart
                data={combined.hrlCumulative}
                id="cum-hrl"
                label="Records linked (cumulative)"
              />
            </TabsContent>
            <TabsContent value="abha">
              <CumulativeChart
                data={combined.abhaCumulative}
                id="cum-abha"
                label="ABHAs created (cumulative)"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Partner breakdown + statewise */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Partner breakdown — ABHAs created</CardTitle>
            <CardDescription>All-time totals per tracked partner</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={partnerChartConfig}
              className="w-full"
              style={{ height: Math.max(topPartnersAbha.length, 3) * 34 + 30 }}
            >
              <BarChart
                data={topPartnersAbha}
                layout="vertical"
                margin={{ left: 8, right: 52 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={190}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 28 ? v.slice(0, 26) + "…" : v)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={[3, 6, 6, 3]}
                  barSize={18}
                  label={{
                    position: "right",
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                    formatter: (v: unknown) => fmtCompact(Number(v)),
                  }}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>States — ABHAs created</CardTitle>
            <CardDescription>Summed across tracked partners</CardDescription>
          </CardHeader>
          <CardContent>
            <StatewiseChart data={partners.statewiseAbha} top={15} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>States — health records linked</CardTitle>
          <CardDescription>Summed across tracked partners</CardDescription>
        </CardHeader>
        <CardContent>
          <StatewiseChart data={partners.statewiseHrl} top={15} />
        </CardContent>
      </Card>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-soft-foreground">
          <Icon className="size-4" aria-hidden />
          {title}
        </div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        <p className="text-xs leading-relaxed text-placeholder-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
