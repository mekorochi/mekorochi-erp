import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-9 w-64 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse mt-2" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-7 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="mb-8">
        <div className="h-4 w-28 bg-muted rounded animate-pulse mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 w-28 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-5 w-36 bg-muted rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
