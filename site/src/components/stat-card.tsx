import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/careui/card";
import { Badge } from "@/components/careui/badge";
import { fmtCompact, fmtIN } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  icon: Icon,
  total,
  today,
  last30d,
  accent = false,
}: {
  title: string;
  icon: LucideIcon;
  total: number | null;
  today?: number | null;
  last30d?: number | null;
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
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-soft-foreground">
          <Icon className="size-4" aria-hidden />
          {title}
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
