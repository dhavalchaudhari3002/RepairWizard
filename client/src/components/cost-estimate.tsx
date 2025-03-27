import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, ChevronRight, Info, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

export function CostEstimate({ data }: { data: any }) {
  const [showMLInfo, setShowMLInfo] = useState(false);
  
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
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Cost Estimate</CardTitle>
            <CardDescription>
              {data.useML 
                ? "Using machine learning analysis" 
                : "Based on typical repair costs"}
            </CardDescription>
          </div>
          {data.useML && (
            <Dialog open={showMLInfo} onOpenChange={setShowMLInfo}>
              <DialogTrigger asChild>
                <Badge variant="outline" className="flex items-center gap-1 border-primary/50 cursor-pointer hover:bg-primary/10 transition-colors">
                  <Brain className="h-3 w-3 text-primary" />
                  <span className="text-xs">AI Powered</span>
                  <Info className="h-3 w-3 ml-1 text-muted-foreground" />
                </Badge>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI-Powered Cost Estimates
                  </DialogTitle>
                  <DialogDescription>
                    How machine learning improves repair cost accuracy
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <h4 className="font-medium">Training Data Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Our machine learning model is trained on thousands of real repair cases across different device types and issues.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Personalized Estimates</h4>
                    <p className="text-sm text-muted-foreground">
                      The model considers device specifics, issue complexity, parts costs, and labor requirements to provide a more accurate estimate.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Continuous Learning</h4>
                    <p className="text-sm text-muted-foreground">
                      Our system improves over time as more repair data becomes available, making estimates increasingly accurate.
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-primary">Benefits:</span>
                    </div>
                    <ul className="text-sm space-y-1 mt-1 pl-5 list-disc text-muted-foreground">
                      <li>More precise cost ranges</li>
                      <li>Better prediction of repair difficulty</li>
                      <li>More accurate time estimates</li>
                      <li>Confidence scoring to indicate estimate reliability</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
        
        {data.useML && data.confidence && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-medium">AI Confidence</h4>
              <span className="text-xs text-muted-foreground">
                {Math.round(data.confidence * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${data.confidence * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
