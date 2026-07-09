import Link from "next/link";
import { ArrowRight, Database, FileHeart, IdCard, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/careui/card";
import { Badge } from "@/components/careui/badge";
import { trackers } from "@/lib/trackers";
import { meta, summary } from "@/lib/abdm/data";
import { fmtCompact, fmtDateLong } from "@/lib/format";

const abdmStats = [
  { label: "ABHAs created", value: summary.abha.total, icon: IdCard },
  { label: "Records linked", value: summary.hrl.total, icon: FileHeart },
  { label: "Partners tracked", value: summary.partnersTracked, icon: Users },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">CARE Usage Tracker</h1>
        <p className="mt-2 text-soft-foreground">
          Usage and adoption metrics for the CARE ecosystem, mirrored from
          public health dashboards for tracked partners. Pick a tracker to
          explore.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {trackers.map((t) => (
          <Link key={t.slug} href={`/${t.slug}/`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Database className="size-4" aria-hidden />
                    </span>
                    {t.name}
                  </CardTitle>
                  <Badge variant="info">{t.fullName}</Badge>
                </div>
                <CardDescription className="pt-1">{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-3 gap-4">
                  {abdmStats.map((s) => (
                    <div key={s.label}>
                      <dt className="flex items-center gap-1 text-xs text-placeholder-foreground">
                        <s.icon className="size-3.5" aria-hidden />
                        {s.label}
                      </dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums">
                        {fmtCompact(s.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 flex items-center gap-1 text-xs text-placeholder-foreground">
                  snapshot · {fmtDateLong(meta.snapshotDate)}
                  <ArrowRight className="ml-auto size-4 text-soft-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
