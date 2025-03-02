import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ErrorDashboard() {
  const { data: errorStats, isLoading } = useQuery({
    queryKey: ["/api/errors/stats"],
    queryFn: async () => {
      const res = await fetch("/api/errors/stats");
      if (!res.ok) throw new Error("Failed to fetch error statistics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <Progress value={errorStats?.errorRate || 0} />
              <p className="text-sm text-muted-foreground">
                {errorStats?.errorRate}% of requests resulted in errors
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Common Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {errorStats?.commonErrors.map((error: any, index: number) => (
                <li key={index} className="flex justify-between">
                  <span>{error.type}</span>
                  <span className="text-muted-foreground">{error.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end justify-between">
              {errorStats?.timeline.map((point: any, index: number) => (
                <div
                  key={index}
                  className="bg-primary/10 hover:bg-primary/20 transition-colors w-4"
                  style={{ height: `${(point.count / errorStats.maxCount) * 100}%` }}
                >
                  <span className="sr-only">{point.count} errors</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
