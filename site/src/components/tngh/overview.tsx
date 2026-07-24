"use client";

import { useMemo } from "react";
import {
  Building2,
  FileHeart,
  Gauge,
  HeartPulse,
  IdCard,
  Layers,
  QrCode,
} from "lucide-react";
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
import { Badge } from "@/components/careui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/careui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/careui/tabs";
import { StatCard } from "@/components/abdm/stat-card";
import { AbhaTrendChart } from "@/components/abdm/charts/abha-trend-chart";
import { HrlTrendChart } from "@/components/abdm/charts/hrl-trend-chart";
import { CumulativeChart } from "@/components/abdm/charts/cumulative-chart";
import { facilities, partners, summary, trends, type TopHrlFacilityRow } from "@/lib/tngh/data";
import { fmtCompact, fmtIN, fmtRate } from "@/lib/format";

const partnerChartConfig = {
  value: { label: "Total", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TnghOverview() {
  const combined = trends.combined;

  const bridgeAbha = useMemo(
    () =>
      [...partners]
        .sort((a, b) => b.abhaTotal - a.abhaTotal)
        .map((p) => ({ name: p.name, value: p.abhaTotal })),
    [],
  );
  const bridgeHrl = useMemo(
    () =>
      [...partners]
        .sort((a, b) => b.hrlTotal - a.hrlTotal)
        .map((p) => ({ name: p.name, value: p.hrlTotal })),
    [],
  );

  const linkageDepth30d =
    summary.abhaLinked.last30d > 0
      ? summary.hrl.last30d / summary.abhaLinked.last30d
      : null;

  const topFacility = facilities.topHrl.last30d[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tamil Nadu — government hospitals
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-soft-foreground">
          ABHA identities created, health records linked, and Scan &amp; Share
          activity across Tamil Nadu&apos;s government &amp; public health
          facilities, served by the {summary.partnersTracked} e-Sushrut family
          bridges, mirrored from the official NHA dashboard.
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="ABHA numbers created"
          icon={IdCard}
          total={summary.abha.total}
          today={summary.abha.today}
          last30d={summary.abha.last30d}
          weekGrowthPct={summary.abha.weekGrowthPct}
          sparkline={combined.abhaDaily}
          sparklineId="tn-abha"
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
          sparklineId="tn-hrl"
          accent
        />
        <StatCard
          title="ABHAs linked to records"
          icon={HeartPulse}
          total={summary.abhaLinked.total}
          today={summary.abhaLinked.today}
          last30d={summary.abhaLinked.last30d}
          weekGrowthPct={summary.abhaLinked.weekGrowthPct}
          sparkline={combined.hrlDaily.map((p) => ({ date: p.date, value: p.abhasLinked }))}
          sparklineId="tn-abha-linked"
        />
        <StatCard
          title="Scan & Share tokens"
          icon={QrCode}
          total={summary.sas.total}
          today={summary.sas.today}
          last30d={summary.sas.last30d}
          weekGrowthPct={summary.sas.weekGrowthPct}
          sparkline={combined.sasDaily}
          sparklineId="tn-sas"
        />
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          icon={Building2}
          title="Scan & Share footprint"
          value={`${fmtIN(summary.sas.facilities)} facilities`}
          detail={`government facilities generating tokens, across ${summary.districtsCovered} of 38 districts`}
        />
        <InsightCard
          icon={Gauge}
          title="Daily run-rate"
          value={fmtRate(summary.abha.perDay7d) + " ABHAs"}
          detail={`7-day average · records linked at ${fmtRate(summary.hrl.perDay7d)} (30-day: ${fmtRate(
            summary.hrl.perDay30d,
          )})`}
        />
        <InsightCard
          icon={Layers}
          title="Linkage depth"
          value={
            linkageDepth30d != null
              ? `${linkageDepth30d.toLocaleString("en-IN", { maximumFractionDigits: 2 })}×`
              : "—"
          }
          detail="records linked per ABHA (30 days), across all TN govt bridges"
        />
        <InsightCard
          icon={FileHeart}
          title="Busiest facility (30 days)"
          value={topFacility ? fmtCompact(topFacility.records) : "—"}
          detail={
            topFacility
              ? `records linked at ${topFacility.name} (${topFacility.district})`
              : "no facility activity reported"
          }
        />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ABHA creation trend</CardTitle>
            <CardDescription>All TN govt bridges combined</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="mb-3">
                <TabsTrigger value="daily">Last 30 days</TabsTrigger>
                <TabsTrigger value="all">Full history (weekly)</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                <AbhaTrendChart data={combined.abhaDaily} id="tn-abha-daily" />
              </TabsContent>
              <TabsContent value="all">
                <AbhaTrendChart data={combined.abhaWeeklyAll} id="tn-abha-all" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health records linked trend</CardTitle>
            <CardDescription>All TN govt bridges combined</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="mb-3">
                <TabsTrigger value="daily">Last 30 days</TabsTrigger>
                <TabsTrigger value="all">Full history (weekly)</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                <HrlTrendChart data={combined.hrlDaily} id="tn-hrl-daily" />
              </TabsContent>
              <TabsContent value="all">
                <HrlTrendChart data={combined.hrlWeeklyAll} id="tn-hrl-all" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Scan & Share trend */}
      <Card>
        <CardHeader>
          <CardTitle>Scan &amp; Share tokens trend</CardTitle>
          <CardDescription>
            OPD registration tokens generated via Scan &amp; Share in TN government facilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList className="mb-3">
              <TabsTrigger value="daily">Last 30 days</TabsTrigger>
              <TabsTrigger value="all">Full history (daily)</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              <AbhaTrendChart data={combined.sasDaily} id="tn-sas-daily" label="Tokens generated" />
            </TabsContent>
            <TabsContent value="all">
              <AbhaTrendChart data={combined.sasAll} id="tn-sas-all" label="Tokens generated" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cumulative growth */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative growth</CardTitle>
          <CardDescription>Running totals across TN govt bridges, from weekly history</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hrl">
            <TabsList className="mb-3">
              <TabsTrigger value="hrl">Health records linked</TabsTrigger>
              <TabsTrigger value="abha">ABHAs created</TabsTrigger>
              <TabsTrigger value="abha-linked">ABHAs linked</TabsTrigger>
              <TabsTrigger value="sas">Scan &amp; Share</TabsTrigger>
            </TabsList>
            <TabsContent value="hrl">
              <CumulativeChart data={combined.hrlCumulative} id="tn-cum-hrl" label="Records linked (cumulative)" />
            </TabsContent>
            <TabsContent value="abha">
              <CumulativeChart data={combined.abhaCumulative} id="tn-cum-abha" label="ABHAs created (cumulative)" />
            </TabsContent>
            <TabsContent value="abha-linked">
              <CumulativeChart
                data={combined.abhaLinkedCumulative}
                id="tn-cum-abha-linked"
                label="ABHAs linked (cumulative)"
              />
            </TabsContent>
            <TabsContent value="sas">
              <CumulativeChart data={combined.sasCumulative} id="tn-cum-sas" label="Tokens generated (cumulative)" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bridge breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BridgeBar title="Bridge breakdown — ABHAs created" data={bridgeAbha} />
        <BridgeBar title="Bridge breakdown — health records linked" data={bridgeHrl} />
      </div>

      {/* Top facilities by records linked */}
      <Card>
        <CardHeader>
          <CardTitle>Top facilities — health records linked</CardTitle>
          <CardDescription>
            Top 10 government facilities in Tamil Nadu, as ranked by the upstream dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="last30d">
            <TabsList className="mb-3">
              <TabsTrigger value="last30d">Last 30 days</TabsTrigger>
              <TabsTrigger value="allTime">All-time</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
            </TabsList>
            <TabsContent value="last30d">
              <TopHrlTable rows={facilities.topHrl.last30d} />
            </TabsContent>
            <TabsContent value="allTime">
              <TopHrlTable rows={facilities.topHrl.allTime} />
            </TabsContent>
            <TabsContent value="today">
              <TopHrlTable rows={facilities.topHrl.today} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function BridgeBar({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>All-time totals per bridge</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={partnerChartConfig}
          className="w-full"
          style={{ height: Math.max(data.length, 3) * 34 + 30 }}
        >
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 52 }}>
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
  );
}

function TopHrlTable({ rows }: { rows: TopHrlFacilityRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Facility</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>District</TableHead>
          <TableHead className="text-right">Records linked</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={`${r.name}-${i}`}>
            <TableCell className="text-placeholder-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell className="max-w-96 truncate font-medium" title={r.name}>
              {r.name}
            </TableCell>
            <TableCell>
              <Badge variant="neutral">{r.class}</Badge>
            </TableCell>
            <TableCell className="text-soft-foreground">{r.district}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtIN(r.records)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
