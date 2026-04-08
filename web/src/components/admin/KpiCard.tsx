import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TrendBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  pct?: number;
  icon: React.ElementType;
  iconClass?: string;
  loading?: boolean;
  valueClass?: string;
}

export function KpiCard({ title, value, sub, pct, icon: Icon, iconClass, loading, valueClass }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${iconClass ?? "text-primary"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</div>
            {(sub || pct !== undefined) && (
              <div className="flex items-center gap-2 mt-1">
                {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
                {pct !== undefined && <TrendBadge pct={pct} />}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
