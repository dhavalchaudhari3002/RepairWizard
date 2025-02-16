import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { RepairQuestions } from "./repair-questions";

interface RepairGuidanceData {
  productType: string;
  issueDescription?: string;
  commonIssues: string[];
  recommendations: string[];
}

export function RepairGuidance({ data }: { data: RepairGuidanceData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repair Guidance</CardTitle>
        <CardDescription>Common issues and recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Common Issues</h3>
          <ul className="space-y-2">
            {data.commonIssues.map((issue: string, i: number) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Recommendations</h3>
          <ul className="space-y-2">
            {data.recommendations.map((rec: string, i: number) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Ask about your repair</h3>
          <RepairQuestions 
            productType={data.productType} 
            issueDescription={data.issueDescription}
          />
        </div>
      </CardContent>
    </Card>
  );
}