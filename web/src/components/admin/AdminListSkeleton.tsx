import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminListSkeleton({
  statsCount = 4,
  filterRows = 1,
  tableColumns = 6,
  tableRows = 10,
}: {
  statsCount?: number;
  filterRows?: number;
  tableColumns?: number;
  tableRows?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: statsCount }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <div className="flex flex-wrap gap-2 pt-2">
            {Array.from({ length: filterRows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-40" />
            ))}
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="space-y-2 p-3 md:hidden">
            {Array.from({ length: Math.min(tableRows, 6) }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="space-y-2 rounded-xl border border-border/80 bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                </div>
                <Skeleton className="h-4 max-w-[220px] w-[75%]" />
                <Skeleton className="h-7 w-32" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-0.5">
                  {Array.from({ length: Math.min(4, Math.ceil(tableColumns / 2)) }).map((__, j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-border/60 pt-2.5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                  <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                  <Skeleton className="h-9 flex-1 rounded-md" />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {Array.from({ length: tableColumns }).map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: tableRows }).map((_, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {Array.from({ length: tableColumns }).map((_, colIdx) => (
                      <TableCell key={colIdx}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
