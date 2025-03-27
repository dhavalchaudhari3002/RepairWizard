import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ProtectedRoute } from "@/lib/protected-route";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Define the dashboard component
function AnalyticsDashboardContent() {
  // Date range state
  const [date, setDate] = useState<{
    from: Date;
    to: Date;
  }>({
    from: addDays(new Date(), -30), // Default to last 30 days
    to: new Date(),
  });

  // Interaction type filter state
  const [interactionType, setInteractionType] = useState<string | undefined>(undefined);

  // Format date range for API query
  const startDate = date.from ? format(date.from, 'yyyy-MM-dd') : undefined;
  const endDate = date.to ? format(date.to, 'yyyy-MM-dd') : undefined;

  // Fetch interaction statistics
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['/api/interactions/stats', interactionType, startDate, endDate],
    queryFn: async () => {
      let url = '/api/interactions/stats';
      
      // Add query parameters
      const params = new URLSearchParams();
      if (interactionType) params.append('type', interactionType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch interaction statistics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Data</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'An unknown error occurred while fetching analytics data.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">User Interaction Analytics</h1>
      
      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter analytics data by date range and interaction type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Date Range</p>
              <DatePickerWithRange date={date} setDate={setDate} />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Interaction Type</p>
              <Select value={interactionType || ""} onValueChange={value => setInteractionType(value === "" ? undefined : value)}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="All interaction types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All interaction types</SelectItem>
                  <SelectItem value="view_guide">View Guide</SelectItem>
                  <SelectItem value="view_step">View Step</SelectItem>
                  <SelectItem value="ask_question">Ask Question</SelectItem>
                  <SelectItem value="skip_step">Skip Step</SelectItem>
                  <SelectItem value="complete_guide">Complete Guide</SelectItem>
                  <SelectItem value="abandon_guide">Abandon Guide</SelectItem>
                  <SelectItem value="click_product">Click Product</SelectItem>
                  <SelectItem value="search_video">Search Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.count || 0}</div>
            <p className="text-xs text-muted-foreground">{
              interactionType ? `Filtered to ${interactionType} interactions` : 'All interaction types'
            }</p>
          </CardContent>
        </Card>
        {stats?.avgDuration && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Math.round(stats.avgDuration)} sec</div>
              <p className="text-xs text-muted-foreground">Average time spent on guides</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Product Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {stats?.topProductTypes && stats.topProductTypes.length > 0 
                ? stats.topProductTypes[0].productType 
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.topProductTypes && stats.topProductTypes.length > 0 
                ? `${stats.topProductTypes[0].count} interactions` 
                : 'No data available'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Analytics */}
      <Tabs defaultValue="interactions" className="mb-8">
        <TabsList>
          <TabsTrigger value="interactions">Interactions by Type</TabsTrigger>
          <TabsTrigger value="products">Product Types</TabsTrigger>
        </TabsList>
        <TabsContent value="interactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Interaction Distribution</CardTitle>
              <CardDescription>Breakdown of interactions by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {stats?.interactionsByType && stats.interactionsByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.interactionsByType}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="type" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No interaction data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Type Distribution</CardTitle>
              <CardDescription>Breakdown of interactions by product type</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row items-center gap-8">
              <div className="h-[300px] w-full lg:w-[400px]">
                {stats?.topProductTypes && stats.topProductTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.topProductTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="productType"
                        label={({ productType, percent }) => 
                          `${productType}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {stats.topProductTypes.map((entry: { productType: string, count: number }, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [value, props.payload.productType]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No product type data available</p>
                  </div>
                )}
              </div>
              
              <div className="w-full">
                <h4 className="text-sm font-medium mb-4">Top Product Types</h4>
                <div className="space-y-4">
                  {stats?.topProductTypes && stats.topProductTypes.length > 0 ? (
                    stats.topProductTypes.map((item: { productType: string, count: number }, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{item.productType}</span>
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No product type data available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Metrics Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Insights</CardTitle>
          <CardDescription>Understanding the data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Interaction Types</h3>
              <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>View Guide</strong> - A user opened a repair guide</li>
                <li><strong>View Step</strong> - A user viewed a specific step in a guide</li>
                <li><strong>Ask Question</strong> - A user asked a question related to a repair</li>
                <li><strong>Skip Step</strong> - A user skipped a step in a guide</li>
                <li><strong>Complete Guide</strong> - A user completed all steps in a guide</li>
                <li><strong>Abandon Guide</strong> - A user left a guide before completion</li>
                <li><strong>Click Product</strong> - A user clicked on a recommended product</li>
                <li><strong>Search Video</strong> - A user searched for a repair video</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-medium">Insights</h3>
              <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground mt-1 space-y-1">
                <li>Higher <strong>guide completion</strong> rates indicate more useful repair guides</li>
                <li>High <strong>abandonment</strong> at specific steps may indicate confusing instructions</li>
                <li><strong>Video searches</strong> suggest users need more visual demonstrations</li>
                <li><strong>Product clicks</strong> can help identify popular replacement parts</li>
                <li><strong>Questions</strong> highlight areas where guides could be improved</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrap with ProtectedRoute for security
export default function AnalyticsDashboard() {
  return (
    <ProtectedRoute component={AnalyticsDashboardContent} />
  );
}