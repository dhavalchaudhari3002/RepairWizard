import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Loader2, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Server, 
  Code2, 
  AlertOctagon, 
  Filter, 
  BarChart, 
  Layers
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Enhanced types for error stats
interface EnhancedErrorStats {
  errorRate: number;
  totalErrors: number;
  totalRequests: number;
  unresolvedCount: number;
  
  // Breakdowns
  severityCounts: Record<string, number>;
  environmentCounts: Record<string, number>;
  componentCounts: Record<string, number>;
  versionCounts: Record<string, number>;
  
  // Common error data
  commonErrors: { type: string; count: number }[];
  
  // Timeline data
  timeline: { hour: string; label: string; count: number }[];
  maxCount: number;
  
  // Most recent errors
  recentErrors: {
    id: number;
    message: string;
    type: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component?: string;
    resolved: boolean;
  }[];
}

// Severity color mapping
const severityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500"
};

// Severity badge variant mapping 
// Using only variants supported by shadcn Badge component: "default", "secondary", "destructive", "outline"
const severityVariants: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
  high: "destructive", 
  critical: "destructive"
};

export default function ErrorDashboard() {
  // State for filters
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [environment, setEnvironment] = useState<string | undefined>(undefined);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | undefined>(undefined);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const [selectedError, setSelectedError] = useState<any>(null);
  
  // Query for error stats with filters
  const { data: errorStats, isLoading, isError, refetch } = useQuery<EnhancedErrorStats>({
    queryKey: ["/api/errors/stats", timeRange, environment, severity],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (environment) params.append('environment', environment);
      if (severity) params.append('severity', severity);
      
      const res = await fetch(`/api/errors/stats?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch error statistics");
      return res.json();
    },
    retry: 3, // Retry failed requests 3 times
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Handler for viewing error details
  const handleViewErrorDetails = async (errorId: number) => {
    try {
      const res = await fetch(`/api/errors/${errorId}`);
      if (!res.ok) throw new Error("Failed to fetch error details");
      const errorDetails = await res.json();
      setSelectedError(errorDetails);
      setShowErrorDetails(true);
    } catch (error) {
      console.error("Error fetching error details:", error);
    }
  };
  
  // Handler for resolving an error
  const handleResolveError = async (errorId: number) => {
    try {
      const res = await fetch(`/api/errors/${errorId}/resolve`, {
        method: 'PATCH',
      });
      
      if (!res.ok) throw new Error("Failed to resolve error");
      
      // Refetch data to update the UI
      refetch();
      
      // Close the dialog if it's the selected error
      if (selectedError && selectedError.id === errorId) {
        setShowErrorDetails(false);
      }
    } catch (error) {
      console.error("Error resolving error:", error);
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold">Error Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[150px]">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Last Hour</SelectItem>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Environment Selector */}
          <Select 
            value={environment || ""} 
            onValueChange={(value) => setEnvironment(value || undefined)}
          >
            <SelectTrigger className="w-[150px]">
              <Server className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Environments</SelectItem>
              {Object.keys(errorStats.environmentCounts || {}).map((env) => (
                <SelectItem key={env} value={env}>
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Severity Selector */}
          <Select 
            value={severity || ""} 
            onValueChange={(value: any) => setSeverity(value || undefined)}
          >
            <SelectTrigger className="w-[150px]">
              <AlertCircle className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Severities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Error Rate</CardTitle>
            <CardDescription>Percentage of requests with errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress 
                value={errorStats.errorRate || 0} 
                max={100} 
                className={`h-3 ${errorStats.errorRate > 50 ? 'bg-destructive/20' : 'bg-primary/20'}`}
              />
              <div className="flex justify-between">
                <span className="text-3xl font-bold">
                  {errorStats.errorRate.toFixed(2)}%
                </span>
                <div>
                  <div className="text-sm text-muted-foreground text-right">
                    {errorStats.totalErrors} / {errorStats.totalRequests}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    errors / requests
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Unresolved</CardTitle>
            <CardDescription>Errors awaiting resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {errorStats.unresolvedCount}
              </span>
              <AlertOctagon className={`h-8 w-8 ${
                errorStats.unresolvedCount > 20 ? 'text-destructive' :
                errorStats.unresolvedCount > 10 ? 'text-orange-500' :
                errorStats.unresolvedCount > 0 ? 'text-amber-500' : 'text-green-500'
              }`} />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {errorStats.unresolvedCount > 0 
                ? `${((errorStats.unresolvedCount / errorStats.totalErrors) * 100).toFixed(1)}% of all errors` 
                : 'All errors resolved'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Severity Breakdown</CardTitle>
            <CardDescription>Error counts by severity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(errorStats.severityCounts || {}).map(([severity, count]) => (
                count > 0 && (
                  <div key={severity} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full ${severityColors[severity as keyof typeof severityColors] || 'bg-gray-500'} mr-2`}></div>
                      <span className="capitalize">{severity}</span>
                    </div>
                    <span className="font-mono">{count}</span>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Environments</CardTitle>
            <CardDescription>Error counts by environment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(errorStats.environmentCounts || {})
                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                .map(([env, count], index) => (
                  count > 0 && (
                    <div key={env} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="truncate capitalize">{env}</span>
                      </div>
                      <span className="font-mono">{count}</span>
                    </div>
                  )
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="h-4 w-4 mr-2" />
            Recent Errors
          </TabsTrigger>
          <TabsTrigger value="components">
            <Code2 className="h-4 w-4 mr-2" />
            Components
          </TabsTrigger>
          <TabsTrigger value="versions">
            <Layers className="h-4 w-4 mr-2" />
            Versions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Error Timeline and Common Errors - Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Error Timeline</CardTitle>
                <CardDescription>
                  {timeRange === 'hour' ? 'Error frequency per 5 minutes' :
                   timeRange === 'day' ? 'Error frequency per hour' :
                   timeRange === 'week' ? 'Error frequency per day' : 
                   'Error frequency per day'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorStats.timeline && errorStats.timeline.length > 0 && errorStats.maxCount > 0 ? (
                  <div className="h-[300px] flex items-end justify-between">
                    {errorStats.timeline.map((point, index) => (
                      <div
                        key={index}
                        className="bg-primary/10 hover:bg-primary/20 transition-colors w-[3%] relative group"
                        style={{ 
                          height: `${Math.max((point.count / errorStats.maxCount) * 100, 2)}%`,
                          minWidth: '8px' 
                        }}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-popover p-2 rounded shadow-md text-xs hidden group-hover:block whitespace-nowrap z-10">
                          {point.label}: {point.count} error{point.count !== 1 ? 's' : ''}
                        </div>
                        <span className="sr-only">{point.count} errors</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No timeline data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Common Errors</CardTitle>
                <CardDescription>Frequency by error type</CardDescription>
              </CardHeader>
              <CardContent>
                {errorStats.commonErrors && errorStats.commonErrors.length > 0 ? (
                  <div className="space-y-4">
                    {errorStats.commonErrors.map((error, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{error.type}</span>
                          <Badge>{error.count}</Badge>
                        </div>
                        <Progress 
                          value={error.count} 
                          max={errorStats.commonErrors[0].count} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No errors recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Most recent error occurrences</CardDescription>
            </CardHeader>
            <CardContent>
              {errorStats.recentErrors && errorStats.recentErrors.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Timestamp</TableHead>
                      <TableHead className="w-[80px]">Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[80px]">Severity</TableHead>
                      <TableHead className="text-right w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorStats.recentErrors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell className="font-mono">
                          {new Date(error.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>{error.type}</TableCell>
                        <TableCell className="font-mono text-xs truncate" style={{ maxWidth: "300px" }}>
                          {error.message}
                        </TableCell>
                        <TableCell>
                          <Badge variant={severityVariants[error.severity]}>
                            {error.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewErrorDetails(error.id)}
                          >
                            View
                          </Button>
                          {!error.resolved && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleResolveError(error.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Recent Errors</h3>
                  <p className="text-muted-foreground mt-2">
                    No errors have been recorded recently.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>Errors by Component</CardTitle>
              <CardDescription>Error distribution across application components</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(errorStats.componentCounts || {}).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(errorStats.componentCounts)
                    .sort((a, b) => b[1] - a[1]) // Sort by count descending
                    .map(([component, count], index) => (
                      <div key={component} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium font-mono text-sm">
                            {component === 'unknown' ? 'Unknown Component' : component}
                          </span>
                          <Badge>{count}</Badge>
                        </div>
                        <Progress 
                          value={count} 
                          max={Object.values(errorStats.componentCounts)[0]} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No component data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>Errors by Version</CardTitle>
              <CardDescription>Error distribution across application versions</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(errorStats.versionCounts || {}).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(errorStats.versionCounts)
                    .sort((a, b) => b[1] - a[1]) // Sort by count descending
                    .map(([version, count], index) => (
                      <div key={version} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className="font-mono">
                            {version === 'unknown' ? 'Unknown Version' : `v${version}`}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress 
                          value={count} 
                          max={Object.values(errorStats.versionCounts)[0]} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No version data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Error Details Dialog */}
      {selectedError && (
        <Dialog open={showErrorDetails} onOpenChange={setShowErrorDetails}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {selectedError.type} Error
              </DialogTitle>
              <DialogDescription>
                Occurred on {new Date(selectedError.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-mono text-sm overflow-auto whitespace-pre-wrap">
                  {selectedError.message}
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Severity</h4>
                  <Badge variant={severityVariants[(selectedError.severity || 'medium') as keyof typeof severityVariants]}>
                    {selectedError.severity || 'medium'}
                  </Badge>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <Badge variant="outline" className={selectedError.resolved ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                    {selectedError.resolved ? "Resolved" : "Unresolved"}
                  </Badge>
                </div>
                
                {selectedError.component && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Component</h4>
                    <p className="text-sm font-mono">{selectedError.component}</p>
                  </div>
                )}
                
                {selectedError.environment && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Environment</h4>
                    <p className="text-sm font-mono">{selectedError.environment}</p>
                  </div>
                )}
                
                {selectedError.version && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Version</h4>
                    <p className="text-sm font-mono">v{selectedError.version}</p>
                  </div>
                )}
                
                {selectedError.path && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Path</h4>
                    <p className="text-sm font-mono">{selectedError.path}</p>
                  </div>
                )}
              </div>
              
              {selectedError.stack && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Stack Trace</h4>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[200px]">
                    {selectedError.stack}
                  </pre>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                {!selectedError.resolved && (
                  <Button 
                    variant="default"
                    onClick={() => handleResolveError(selectedError.id)}
                  >
                    Mark as Resolved
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowErrorDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
