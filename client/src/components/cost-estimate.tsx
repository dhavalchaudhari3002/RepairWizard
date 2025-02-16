import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function CostEstimate({ data }: { data: any }) {
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
            <span>${data.costRange.min} - ${data.costRange.max}</span>
          </div>
          <Progress value={75} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-1">Time Estimate</h4>
            <p className="text-sm text-muted-foreground">{data.timeEstimate}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Difficulty</h4>
            <p className="text-sm text-muted-foreground">{data.difficulty}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
