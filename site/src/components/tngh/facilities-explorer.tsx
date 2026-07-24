"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Activity, Search } from "lucide-react";
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
import { Input } from "@/components/careui/input";
import { HrlTrendChart } from "@/components/abdm/charts/hrl-trend-chart";
import { AbhaTrendChart } from "@/components/abdm/charts/abha-trend-chart";
import { facilities, facilityTrends, summary } from "@/lib/tngh/data";
import { fmtCompact, fmtIN, pct } from "@/lib/format";

type Metric = "sas" | "hrl" | "abhasLinked";
type Window = "total" | "recent" | "today";

const ALL = "__all__";

/** Unified row shape across metrics. */
interface Row {
  name: string;
  district: string;
  class: string;
  total: number;
  recent: number;
  today: number;
}

const METRIC: Record<
  Metric,
  { label: string; unit: string; recentLabel: string; color: string; empty: string }
> = {
  sas: {
    label: "Scan & Share",
    unit: "Tokens",
    recentLabel: "This month",
    color: "var(--chart-2)",
    empty: "No facility generated Scan & Share tokens",
  },
  hrl: {
    label: "Records linked",
    unit: "Records",
    recentLabel: "Last 30 days",
    color: "var(--chart-1)",
    empty: "No facility linked health records",
  },
  abhasLinked: {
    label: "ABHAs linked",
    unit: "ABHAs",
    recentLabel: "Last 30 days",
    color: "var(--chart-3)",
    empty: "No facility linked ABHAs",
  },
};

const WINDOW_LABEL = (metric: Metric): Record<Window, string> => ({
  total: "All-time",
  recent: METRIC[metric].recentLabel,
  today: "Today",
});

const sasRows: Row[] = facilities.sas.map((f) => ({
  name: f.name,
  district: f.district,
  class: f.class,
  total: f.total,
  recent: f.month,
  today: f.today,
}));

const hrlRows: Row[] = facilities.hrl.map((f) => ({
  name: f.name,
  district: f.district,
  class: f.class,
  total: f.records,
  recent: f.records30d,
  today: f.recordsToday,
}));

const abhasLinkedRows: Row[] = facilities.hrl.map((f) => ({
  name: f.name,
  district: f.district,
  class: f.class,
  total: f.abhasLinked,
  recent: f.abhasLinked30d,
  today: f.abhasLinkedToday,
}));

const METRIC_ROWS: Record<Metric, Row[]> = {
  sas: sasRows,
  hrl: hrlRows,
  abhasLinked: abhasLinkedRows,
};

/** Stable slug for chart gradient ids. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const TREND_CARD_LIMIT = 12;

export function TnghFacilitiesExplorer() {
  const [metric, setMetric] = useState<Metric>("sas");
  const [window, setWindow] = useState<Window>("total");
  const [district, setDistrict] = useState(ALL);
  const [klass, setKlass] = useState(ALL);
  const [search, setSearch] = useState("");
  const [trendRange, setTrendRange] = useState<"daily" | "all">("daily");

  const districts = useMemo(
    () =>
      [
        ...new Set(
          [...sasRows, ...hrlRows].map((f) => f.district).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [],
  );
  const classes = useMemo(
    () =>
      [...new Set([...sasRows, ...hrlRows].map((f) => f.class))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [],
  );

  const m = METRIC[metric];
  const windowLabel = WINDOW_LABEL(metric)[window];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return METRIC_ROWS[metric]
      .filter(
        (f) =>
          (district === ALL || f.district === district) &&
          (klass === ALL || f.class === klass) &&
          (!q || f.name.toLowerCase().includes(q)) &&
          f[window] > 0,
      )
      .sort((a, b) => b[window] - a[window]);
  }, [metric, window, district, klass, search]);

  const windowTotal = useMemo(() => rows.reduce((s, r) => s + r[window], 0), [rows, window]);

  const chartRows = useMemo(
    () =>
      rows.slice(0, 15).map((r) => ({
        name: r.district ? `${r.name} · ${r.district}` : r.name,
        value: r[window],
      })),
    [rows, window],
  );

  const chartConfig = {
    value: { label: m.unit, color: m.color },
  } satisfies ChartConfig;

  // Per-facility linkage trend cards (records/ABHAs linked — upstream has no
  // per-facility Scan & Share time-series). When any filter narrows the set
  // (search / district / class), show every match; otherwise cap the list so
  // the unfiltered page stays light.
  const filtersActive =
    search.trim() !== "" || district !== ALL || klass !== ALL;
  const trendCards = useMemo(() => {
    if (metric === "sas") return [];
    const hrlByName = new Map(facilities.hrl.map((f) => [f.name.toLowerCase(), f]));
    const trendsByName = new Map(
      Object.entries(facilityTrends).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const eligible = rows.filter((r) => {
      const t = trendsByName.get(r.name.toLowerCase());
      return t && (trendRange === "daily" ? t.daily.length : t.all.length) > 0;
    });
    return (filtersActive ? eligible : eligible.slice(0, TREND_CARD_LIMIT)).map((r) => {
      const t = trendsByName.get(r.name.toLowerCase())!;
      return {
        row: r,
        hrl: hrlByName.get(r.name.toLowerCase()),
        series: trendRange === "daily" ? t.daily : t.all,
      };
    });
  }, [metric, rows, trendRange, filtersActive]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Government facilities
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-soft-foreground">
          Scan &amp; Share tokens, health-record linkage and ABHA linkage across{" "}
          {fmtIN(Math.max(summary.sas.facilities, facilities.hrl.length))} Tamil Nadu government
          facilities in {summary.districtsCovered} districts. Facility class is derived from the
          facility name.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          value={metric}
          onValueChange={(v) => {
            setMetric(v as Metric);
            setWindow("total");
          }}
        >
          <TabsList>
            <TabsTrigger value="sas">Scan &amp; Share</TabsTrigger>
            <TabsTrigger value="hrl">Records linked</TabsTrigger>
            <TabsTrigger value="abhasLinked">ABHAs linked</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={window} onValueChange={(v) => setWindow(v as Window)}>
          <TabsList>
            <TabsTrigger value="total">All-time</TabsTrigger>
            <TabsTrigger value="recent">{m.recentLabel}</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-full lg:w-52" aria-label="Filter by district">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All districts</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={klass} onValueChange={setKlass}>
          <SelectTrigger className="w-full lg:w-60" aria-label="Filter by facility class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All facility classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full lg:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-placeholder-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities…"
            aria-label="Search facilities by name"
            className="pl-8"
          />
        </div>
      </div>

      {/* Top facilities chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            Top facilities — {m.label.toLowerCase()} ({windowLabel.toLowerCase()})
          </CardTitle>
          <CardDescription>
            {district === ALL ? "All districts" : district}
            {klass === ALL ? "" : ` · ${klass}`} · top {Math.min(chartRows.length, 15)} of{" "}
            {fmtIN(rows.length)} active facilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartRows.length === 0 ? (
            <EmptyNote
              text={`${m.empty} ${window === "total" ? "yet" : windowLabel.toLowerCase()} for this filter.`}
            />
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
                  width={240}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 36 ? v.slice(0, 34) + "…" : v)}
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

      {/* Facilities table */}
      <Card>
        <CardHeader>
          <CardTitle>Facilities</CardTitle>
          <CardDescription>
            {fmtIN(rows.length)} facilit{rows.length === 1 ? "y" : "ies"} with{" "}
            {m.label.toLowerCase()} {windowLabel.toLowerCase()} ·{" "}
            {district === ALL ? "all districts" : district}
            {klass === ALL ? "" : ` · ${klass}`} · {fmtCompact(windowTotal)}{" "}
            {m.unit.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>District</TableHead>
                <TableHead className="text-right">{windowLabel}</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.name}-${r.district}`}>
                  <TableCell className="text-placeholder-foreground tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell className="max-w-96 truncate font-medium" title={r.name}>
                    {r.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{r.class}</Badge>
                  </TableCell>
                  <TableCell className="text-soft-foreground">{r.district || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtIN(r[window])}</TableCell>
                  <TableCell className="text-right text-soft-foreground tabular-nums">
                    {pct(r[window], windowTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-facility trends — follows the active metric tab */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Facility trends — {m.label}
          </h2>
          <p className="mt-0.5 text-sm text-soft-foreground">
            {metric === "sas"
              ? "Per-facility Scan & Share history is not published upstream."
              : `${m.label}, ${trendRange === "daily" ? "daily over the last 30 days" : "full history"} — ${
                  filtersActive
                    ? `all ${fmtIN(trendCards.length)} matching facilit${trendCards.length === 1 ? "y" : "ies"}`
                    : `top ${Math.min(trendCards.length, TREND_CARD_LIMIT)} facilities`
                }.`}
          </p>
        </div>
        {metric !== "sas" && (
          <Tabs
            value={trendRange}
            onValueChange={(v) => setTrendRange(v as "daily" | "all")}
          >
            <TabsList>
              <TabsTrigger value="daily">Last 30 days</TabsTrigger>
              <TabsTrigger value="all">Full history</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {metric === "sas" ? (
        <Card>
          <CardContent>
            <EmptyNote text="The source dashboard only publishes all-time, this-month and today totals per facility for Scan & Share — no time-series. Switch to Records linked or ABHAs linked for facility trend charts." />
          </CardContent>
        </Card>
      ) : trendCards.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyNote text="No facility in the current filter has record-linkage activity to chart." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {trendCards.map(({ row, hrl, series }) => (
            <Card key={`${metric}-${trendRange}-${row.name}`}>
              <CardHeader>
                <CardTitle className="text-base leading-snug">{row.name}</CardTitle>
                <CardDescription className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="primary">
                    {metric === "abhasLinked"
                      ? `${fmtCompact(hrl?.abhasLinked ?? 0)} ABHAs linked`
                      : `${fmtCompact(hrl?.records ?? 0)} records linked`}
                  </Badge>
                  <Badge variant="neutral">
                    {metric === "abhasLinked"
                      ? `${fmtCompact(hrl?.records ?? 0)} records linked`
                      : `${fmtCompact(hrl?.abhasLinked ?? 0)} ABHAs linked`}
                  </Badge>
                  <Badge variant="neutral">{row.class}</Badge>
                  {row.district && <Badge variant="neutral">{row.district}</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metric === "abhasLinked" ? (
                  <AbhaTrendChart
                    data={series.map((p) => ({ date: p.date, value: p.abhasLinked }))}
                    id={`fac-abl-${trendRange}-${slug(row.name)}`}
                    className="h-48 w-full"
                    label="ABHAs linked"
                  />
                ) : (
                  <HrlTrendChart
                    data={series}
                    id={`fac-${trendRange}-${slug(row.name)}`}
                    className="h-48 w-full"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center">
      <Activity className="size-5 text-placeholder-foreground" aria-hidden />
      <p className="max-w-64 text-sm text-placeholder-foreground">{text}</p>
    </div>
  );
}
