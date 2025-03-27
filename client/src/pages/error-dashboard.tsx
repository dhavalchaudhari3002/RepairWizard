import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Types for error stats
interface ErrorStats {
  errorRate: number;
  commonErrors: { type: string; count: number }[];
  timeline: { hour: string; count: number }[];
  maxCount: number;
}

export default function ErrorDashboard() {
  const { data: errorStats, isLoading, isError } = useQuery<ErrorStats>({
    queryKey: ["/api/errors/stats"],
    queryFn: async () => {
      const res = await fetch("/api/errors/stats");
      if (!res.ok) throw new Error("Failed to fetch error statistics");
      return res.json();
    },
    retry: 3, // Retry failed requests 3 times
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !errorStats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            There was a problem fetching error statistics. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Error Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={errorStats.errorRate || 0} max={100} />
              <p className="text-sm text-muted-foreground">
                {errorStats.errorRate.toFixed(2)}% of requests resulted in errors
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Common Errors</CardTitle>
          </CardHeader>
          <CardContent>
            {errorStats.commonErrors && errorStats.commonErrors.length > 0 ? (
              <ul className="space-y-2">
                {errorStats.commonErrors.map((error, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{error.type}</span>
                    <span className="text-muted-foreground">{error.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No errors recorded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {errorStats.timeline && errorStats.timeline.length > 0 && errorStats.maxCount > 0 ? (
              <div className="h-[200px] flex items-end justify-between">
                {errorStats.timeline.map((point, index) => (
                  <div
                    key={index}
                    className="bg-primary/10 hover:bg-primary/20 transition-colors w-4 relative group"
                    style={{ 
                      height: `${Math.max((point.count / errorStats.maxCount) * 100, 2)}%` 
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-popover p-2 rounded shadow-md text-xs hidden group-hover:block whitespace-nowrap z-10">
                      {new Date(point.hour).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}:
                      {' '}{point.count} error{point.count !== 1 ? 's' : ''}
                    </div>
                    <span className="sr-only">{point.count} errors</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">No timeline data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
