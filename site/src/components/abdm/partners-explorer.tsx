"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { Badge } from "@/components/careui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/careui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/careui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/careui/tabs";
import { AbhaTrendChart } from "@/components/abdm/charts/abha-trend-chart";
import { HrlTrendChart } from "@/components/abdm/charts/hrl-trend-chart";
import {
  meta,
  partners,
  partnerTrends,
  NATIONAL,
  scopeName,
  type PartnerRow,
} from "@/lib/abdm/data";
import { fmtCompact, fmtIN, pct } from "@/lib/format";

type Metric = "abha" | "hrl";
type Range = "daily" | "all";

const chartConfig = {
  value: { label: "Total", color: "var(--chart-2)" },
} satisfies ChartConfig;

const METRIC_LABEL: Record<Metric, string> = {
  abha: "ABHAs created",
  hrl: "Health records linked",
};

/** Stable slug for chart gradient ids. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function PartnersExplorer() {
  const [metric, setMetric] = useState<Metric>("abha");
  const [range, setRange] = useState<Range>("daily");
  const [scope, setScope] = useState(NATIONAL);

  const rows: PartnerRow[] = useMemo(() => {
    const src = partners[metric];
    const list = scope === NATIONAL ? src.national : (src.perState[scope] ?? []);
    return [...list].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [metric, scope]);

  const grandTotal = useMemo(() => rows.reduce((s, r) => s + (r.value ?? 0), 0), [rows]);

  const chartRows = useMemo(
    () => rows.map((r) => ({ name: r.name, value: r.value })),
    [rows],
  );

  // Trend cards keep the national ranking of the active metric so every
  // tracked partner is shown, even when a state filter hides its totals.
  const trendOrder = useMemo(() => {
    const ranked = [...partners[metric].national].sort(
      (a, b) => (b.value ?? 0) - (a.value ?? 0),
    );
    const names = ranked.map((r) => r.name);
    for (const name of partners.allowlist) {
      if (!names.includes(name)) names.push(name);
    }
    return names;
  }, [metric]);

  const states = useMemo(
    () => [...meta.states].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const totalsByName = useMemo(() => {
    const abha = new Map(partners.abha.national.map((r) => [r.name, r.value]));
    const hrl = new Map(partners.hrl.national.map((r) => [r.name, r.value]));
    return { abha, hrl };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tracked partners</h1>
        <p className="mt-1 max-w-2xl text-sm text-soft-foreground">
          A curated allowlist of {partners.allowlist.length} ABDM partners
          (config/abdm/partners.yaml) — ranked by{" "}
          {metric === "abha" ? "ABHAs created" : "health records linked"}.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            <TabsTrigger value="abha">ABHAs created</TabsTrigger>
            <TabsTrigger value="hrl">Records linked</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-full lg:w-56" aria-label="Filter by state">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NATIONAL}>India (national)</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs
          value={range}
          onValueChange={(v) => setRange(v as Range)}
          className="lg:ml-auto"
        >
          <TabsList>
            <TabsTrigger value="daily">Last 30 days</TabsTrigger>
            <TabsTrigger value="all">Full history</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle>Partner comparison — {METRIC_LABEL[metric]}</CardTitle>
          <CardDescription>{scopeName(scope)} · all-time totals</CardDescription>
        </CardHeader>
        <CardContent>
          {chartRows.length === 0 ? (
            <EmptyNote text={`No tracked partner reports ${METRIC_LABEL[metric].toLowerCase()} in ${scopeName(scope)}.`} />
          ) : (
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: Math.max(chartRows.length, 3) * 36 + 30 }}
            >
              <BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 56 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={230}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 34 ? v.slice(0, 32) + "…" : v)}
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
                    formatter: (v: unknown) => fmtIN(Number(v)),
                  }}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Totals table */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
          <CardDescription>
            {fmtIN(rows.length)} tracked partner{rows.length === 1 ? "" : "s"} ·{" "}
            {scopeName(scope)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">{METRIC_LABEL[metric]}</TableHead>
                <TableHead className="text-right">Share of tracked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.name}>
                  <TableCell className="text-placeholder-foreground tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell className="max-w-96 truncate font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtIN(r.value)}</TableCell>
                  <TableCell className="text-right text-soft-foreground tabular-nums">
                    {pct(r.value, grandTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-partner trends */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Partner trends — {METRIC_LABEL[metric]}
        </h2>
        <p className="mt-0.5 text-sm text-soft-foreground">
          National figures, {range === "daily" ? "daily over the last 30 days" : "weekly full history"}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {trendOrder.map((name) => (
          <PartnerTrendCard
            key={`${metric}-${range}-${name}`}
            name={name}
            metric={metric}
            range={range}
            abhaTotal={totalsByName.abha.get(name) ?? null}
            hrlTotal={totalsByName.hrl.get(name) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function PartnerTrendCard({
  name,
  metric,
  range,
  abhaTotal,
  hrlTotal,
}: {
  name: string;
  metric: Metric;
  range: Range;
  abhaTotal: number | null;
  hrlTotal: number | null;
}) {
  const abhaSeries =
    range === "daily" ? partnerTrends.abhaDaily[name] : partnerTrends.abhaWeeklyAll[name];
  const hrlSeries =
    range === "daily" ? partnerTrends.hrlDaily[name] : partnerTrends.hrlWeeklyAll[name];
  const series = metric === "abha" ? abhaSeries : hrlSeries;
  const hasData = (series?.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base leading-snug">{name}</CardTitle>
        <CardDescription className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="primary">{fmtCompact(abhaTotal)} ABHAs</Badge>
          <Badge variant="neutral">{fmtCompact(hrlTotal)} records linked</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          metric === "abha" ? (
            <AbhaTrendChart
              data={partnerTrendsSeries(name, range)}
              id={`p-abha-${range}-${slug(name)}`}
              className="h-48 w-full"
            />
          ) : (
            <HrlTrendChart
              data={range === "daily" ? partnerTrends.hrlDaily[name]! : partnerTrends.hrlWeeklyAll[name]!}
              id={`p-hrl-${range}-${slug(name)}`}
              className="h-48 w-full"
            />
          )
        ) : (
          <EmptyNote
            text={
              (metric === "abha" ? "No ABHA creation" : "No record-linking") +
              (range === "daily" ? " activity in the last 30 days." : " history reported.")
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function partnerTrendsSeries(name: string, range: Range) {
  return (range === "daily" ? partnerTrends.abhaDaily[name] : partnerTrends.abhaWeeklyAll[name]) ?? [];
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center">
      <Activity className="size-5 text-placeholder-foreground" aria-hidden />
      <p className="max-w-64 text-sm text-placeholder-foreground">{text}</p>
    </div>
  );
}
