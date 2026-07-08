"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Badge } from "@/components/careui/badge";
import { Button } from "@/components/careui/button";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/careui/command";
import { Input } from "@/components/careui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/careui/popover";
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
import { meta, partners, NATIONAL, scopeName, type PartnerRow } from "@/lib/data";
import { fmtCompact, fmtIN, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Metric = "abha" | "hrl";

const chartConfig = {
  value: { label: "Total", color: "var(--chart-2)" },
} satisfies ChartConfig;

const METRIC_LABEL: Record<Metric, string> = {
  abha: "ABHAs created",
  hrl: "Health records linked",
};

export function PartnersExplorer() {
  const [metric, setMetric] = useState<Metric>("abha");
  const [scope, setScope] = useState(NATIONAL);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);

  const rows: PartnerRow[] = useMemo(() => {
    const src = partners[metric];
    const list = scope === NATIONAL ? src.national : (src.perState[scope] ?? []);
    return [...list].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [metric, scope]);

  const grandTotal = useMemo(() => rows.reduce((s, r) => s + (r.value ?? 0), 0), [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (selected.length > 0) out = out.filter((r) => selected.includes(r.name));
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((r) => r.name.toLowerCase().includes(q));
    return out;
  }, [rows, query, selected]);

  const chartRows = useMemo(
    () =>
      (selected.length > 0 ? filtered : filtered.slice(0, 15)).map((r) => ({
        name: r.name,
        value: r.value,
      })),
    [filtered, selected],
  );

  const states = useMemo(
    () => [...meta.states].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const toggle = (name: string) =>
    setSelected((cur) =>
      cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name],
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Partners</h1>
        <p className="mt-1 max-w-2xl text-sm text-soft-foreground">
          Every integrated partner reporting to ABDM — government programmes, HMIS vendors,
          insurers, PHR apps — ranked by{" "}
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

        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between lg:w-64">
              {selected.length > 0
                ? `${selected.length} partner${selected.length > 1 ? "s" : ""} selected`
                : "Compare partners…"}
              <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search partners…" />
              <CommandList>
                <CommandEmpty>No partner found.</CommandEmpty>
                <CommandGroup>
                  {rows.slice(0, 400).map((r) => (
                    <CommandItem key={r.name} value={r.name} onSelect={() => toggle(r.name)}>
                      <Check
                        className={cn(
                          "size-4",
                          selected.includes(r.name) ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{r.name}</span>
                      <span className="ml-auto text-xs text-placeholder-foreground tabular-nums">
                        {fmtCompact(r.value)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="relative lg:ml-auto lg:w-72">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-placeholder-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter table by name…"
            className="pl-8"
            aria-label="Filter partners by name"
          />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selected.map((name) => (
            <Badge key={name} variant="primary" className="max-w-64 cursor-pointer" onClick={() => toggle(name)}>
              <span className="truncate">{name}</span>
              <X className="size-3" aria-hidden />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selected.length > 0 ? "Selected partners" : "Top partners"} — {METRIC_LABEL[metric]}
          </CardTitle>
          <CardDescription>{scopeName(scope)} · all-time totals</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(chartRows.length, 3) * 32 + 30 }}
          >
            <BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 48 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={210}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => (v.length > 32 ? v.slice(0, 30) + "…" : v)}
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All partners</CardTitle>
          <CardDescription>
            {fmtIN(filtered.length)} of {fmtIN(rows.length)} partners · {scopeName(scope)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">{METRIC_LABEL[metric]}</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="text-placeholder-foreground tabular-nums">
                    {rows.indexOf(r) + 1}
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
          {filtered.length > 100 && (
            <p className="mt-3 text-xs text-placeholder-foreground">
              Showing first 100 — refine the search to narrow down.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
