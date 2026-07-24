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
import { facilities, summary } from "@/lib/tngh/data";
import { fmtCompact, fmtIN, pct } from "@/lib/format";

type Window = "total" | "month" | "today";

const ALL = "__all__";

const WINDOW_LABEL: Record<Window, string> = {
  total: "All-time",
  month: "This month",
  today: "Today",
};

const chartConfig = {
  value: { label: "Tokens", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TnghFacilitiesExplorer() {
  const [window, setWindow] = useState<Window>("total");
  const [district, setDistrict] = useState(ALL);
  const [klass, setKlass] = useState(ALL);

  const districts = useMemo(
    () =>
      [...new Set(facilities.sas.map((f) => f.district).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [],
  );
  const classes = useMemo(
    () =>
      [...new Set(facilities.sas.map((f) => f.class))].sort((a, b) => a.localeCompare(b)),
    [],
  );

  const rows = useMemo(
    () =>
      facilities.sas
        .filter(
          (f) =>
            (district === ALL || f.district === district) &&
            (klass === ALL || f.class === klass) &&
            f[window] > 0,
        )
        .sort((a, b) => b[window] - a[window]),
    [window, district, klass],
  );

  const windowTotal = useMemo(() => rows.reduce((s, r) => s + r[window], 0), [rows, window]);

  const chartRows = useMemo(
    () =>
      rows.slice(0, 15).map((r) => ({
        name: r.district ? `${r.name} · ${r.district}` : r.name,
        value: r[window],
      })),
    [rows, window],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Government facilities — Scan &amp; Share
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-soft-foreground">
          {fmtIN(summary.sas.facilities)} Tamil Nadu government facilities generating OPD
          registration tokens, across {summary.districtsCovered} districts. Facility class is
          derived from the facility name.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={window} onValueChange={(v) => setWindow(v as Window)}>
          <TabsList>
            <TabsTrigger value="total">All-time</TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-full lg:w-56" aria-label="Filter by district">
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
          <SelectTrigger className="w-full lg:w-64" aria-label="Filter by facility class">
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
      </div>

      {/* Top facilities chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top facilities — tokens generated ({WINDOW_LABEL[window].toLowerCase()})</CardTitle>
          <CardDescription>
            {district === ALL ? "All districts" : district}
            {klass === ALL ? "" : ` · ${klass}`} · top {Math.min(chartRows.length, 15)} of{" "}
            {fmtIN(rows.length)} active facilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartRows.length === 0 ? (
            <EmptyNote text={`No facility generated Scan & Share tokens ${WINDOW_LABEL[window].toLowerCase() === "all-time" ? "yet" : WINDOW_LABEL[window].toLowerCase()} for this filter.`} />
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
            {fmtIN(rows.length)} facilit{rows.length === 1 ? "y" : "ies"} with tokens{" "}
            {WINDOW_LABEL[window].toLowerCase()} ·{" "}
            {district === ALL ? "all districts" : district}
            {klass === ALL ? "" : ` · ${klass}`} · {fmtCompact(windowTotal)} tokens
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
                <TableHead className="text-right">{WINDOW_LABEL[window]}</TableHead>
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
