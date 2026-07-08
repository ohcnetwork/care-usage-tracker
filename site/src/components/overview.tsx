"use client";

import { useMemo, useState } from "react";
import { CalendarRange, FileHeart, Hospital, IdCard, Stethoscope } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/careui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/careui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/careui/card";
import { StatCard } from "@/components/stat-card";
import { AbhaTrendChart } from "@/components/charts/abha-trend-chart";
import { HrlTrendChart } from "@/components/charts/hrl-trend-chart";
import { DistributionBars } from "@/components/charts/distribution-bars";
import { StatewiseChart } from "@/components/charts/statewise-chart";
import { QuarterlyChart } from "@/components/charts/quarterly-chart";
import { abha, hrl, meta, summary, NATIONAL, scopeName } from "@/lib/data";

export function Overview() {
  const [scope, setScope] = useState(NATIONAL);
  const national = scope === NATIONAL;

  const abhaCounters = abha.counters[scope];
  const hrlCounters = hrl.counters[scope];
  const abhaTrend = abha.trendDaily[scope] ?? [];
  const hrlTrend = hrl.trendDaily[scope] ?? [];
  const age = abha.ageGroups[scope] ?? [];
  const gender = abha.gender[scope] ?? [];

  const states = useMemo(
    () => [...meta.states].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ayushman Bharat Digital Mission
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-soft-foreground">
            India&apos;s digital health backbone — ABHA identities created and health records
            linked, mirrored daily from the official NHA dashboard.
          </p>
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Filter by state">
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
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ABHA numbers created"
          icon={IdCard}
          total={abhaCounters?.total ?? null}
          today={abhaCounters?.today}
          currentMonth={abhaCounters?.currentMonth}
          accent
        />
        <StatCard
          title="Health records linked"
          icon={FileHeart}
          total={hrlCounters?.total ?? null}
          today={hrlCounters?.today}
          currentMonth={hrlCounters?.currentMonth}
          accent
        />
        <StatCard
          title="Health facilities (verified)"
          icon={Hospital}
          total={national ? summary.facilities.registered : null}
          today={national ? summary.facilities.today : undefined}
          currentMonth={national ? summary.facilities.currentMonth : undefined}
        />
        <StatCard
          title="Healthcare professionals"
          icon={Stethoscope}
          total={national ? summary.professionals.registered : null}
          today={national ? summary.professionals.today : undefined}
          currentMonth={national ? summary.professionals.currentMonth : undefined}
        />
      </div>
      {!national && (
        <p className="-mt-3 text-xs text-placeholder-foreground">
          Facility and professional counters are only published at the national level.
        </p>
      )}

      {/* Trends */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ABHA creation trend</CardTitle>
            <CardDescription>{scopeName(scope)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="mb-3">
                <TabsTrigger value="daily">Last 30 days</TabsTrigger>
                {national && <TabsTrigger value="all">Since 2020 (weekly)</TabsTrigger>}
              </TabsList>
              <TabsContent value="daily">
                <AbhaTrendChart data={abhaTrend} id={`abha-d-${scope}`} />
              </TabsContent>
              {national && (
                <TabsContent value="all">
                  <AbhaTrendChart data={abha.trendWeeklyAll} id="abha-all" />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health records linked trend</CardTitle>
            <CardDescription>{scopeName(scope)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="mb-3">
                <TabsTrigger value="daily">Last 30 days</TabsTrigger>
                {national && <TabsTrigger value="all">Full history (weekly)</TabsTrigger>}
              </TabsList>
              <TabsContent value="daily">
                <HrlTrendChart data={hrlTrend} id={`hrl-d-${scope}`} />
              </TabsContent>
              {national && (
                <TabsContent value="all">
                  <HrlTrendChart data={hrl.trendWeeklyAll} id="hrl-all" />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ABHAs by age group</CardTitle>
            <CardDescription>{scopeName(scope)}</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBars data={age} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ABHAs by gender</CardTitle>
            <CardDescription>{scopeName(scope)}</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBars data={gender} />
          </CardContent>
        </Card>
      </div>

      {/* Quarterly + statewise */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-4 text-soft-foreground" aria-hidden />
              ABHAs per quarter
            </CardTitle>
            <CardDescription>National, by financial year</CardDescription>
          </CardHeader>
          <CardContent>
            <QuarterlyChart data={abha.quarterly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-4 text-soft-foreground" aria-hidden />
              Health records linked per quarter
            </CardTitle>
            <CardDescription>National, by financial year</CardDescription>
          </CardHeader>
          <CardContent>
            <QuarterlyChart data={hrl.quarterly} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top states by ABHAs created</CardTitle>
          <CardDescription>All-time totals</CardDescription>
        </CardHeader>
        <CardContent>
          <StatewiseChart data={abha.statewise} top={15} />
        </CardContent>
      </Card>
    </div>
  );
}
