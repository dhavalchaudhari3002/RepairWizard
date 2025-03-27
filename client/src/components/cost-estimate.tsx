import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function CostEstimate({ data }: { data: any }) {
  // Calculate a dynamic progress value based on the cost range
  const { progressValue, progressColor } = useMemo(() => {
    // Define our cost scale boundaries
    const maxCostBoundary = 1000; // Assuming most repairs won't exceed $1000
    
    // Calculate the midpoint of the cost range
    const midpointCost = (data.costRange.min + data.costRange.max) / 2;
    
    // Calculate the progress value (0-100)
    const progress = Math.min(
      100,
      Math.max(
        0,
        (midpointCost / maxCostBoundary) * 100
      )
    );
    
    // Determine color based on cost and difficulty
    let color = "";
    if (midpointCost < 100) {
      color = "bg-green-500"; // Low cost
    } else if (midpointCost < 300) {
      color = "bg-yellow-500"; // Medium cost
    } else {
      color = "bg-red-500"; // High cost
    }
    
    return { progressValue: progress, progressColor: color };
  }, [data.costRange.min, data.costRange.max]);
  
  // Determine difficulty indicator color
  const difficultyColor = useMemo(() => {
    switch (data.difficulty) {
      case "Easy":
        return "text-green-500";
      case "Moderate":
        return "text-yellow-500";
      case "Hard":
        return "text-red-500";
      default:
        return "text-blue-500";
    }
  }, [data.difficulty]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Estimate</CardTitle>
        <CardDescription>Based on typical repair costs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span>Estimated Cost Range</span>
            <span className="font-medium">${data.costRange.min} - ${data.costRange.max}</span>
          </div>
          <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500", progressColor)} 
              style={{ width: `${progressValue}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Lower</span>
            <span>Higher</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-1">Time Estimate</h4>
            <p className="text-sm text-muted-foreground">{data.timeEstimate}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Difficulty</h4>
            <p className={cn("text-sm font-medium", difficultyColor)}>{data.difficulty}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
