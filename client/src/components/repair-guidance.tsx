import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Wrench } from "lucide-react";
import { RepairGuide } from "./repair-guide";
import { RepairDiagnostic } from "./diagnostic-analysis-new";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RepairGuidanceData {
  productType: string;
  issueDescription?: string;
  commonIssues: string[];
  recommendations: string[];
  repairRequestId?: number;
  diagnosticData?: RepairDiagnostic | null;
}

export function RepairGuidance({ data }: { data: RepairGuidanceData }) {
  // State to control whether to show the repair guide
  // If we already have diagnostic data, automatically show the guide
  const [showGuide, setShowGuide] = useState(!!data.diagnosticData);

  return (
    <div className="space-y-6">
      {/* Repair Guidance Section */}
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

        </CardContent>
      </Card>

      {/* Repair Guide Card */}
      <Card>
        <CardHeader>
          <CardTitle>Repair Guide</CardTitle>
          <CardDescription>Step-by-step repair instructions</CardDescription>
        </CardHeader>
        <CardContent>
          {!showGuide ? (
            <div className="flex justify-center items-center p-6">
              <Button 
                onClick={() => setShowGuide(true)} 
                className="flex items-center gap-2"
              >
                <Wrench className="h-4 w-4" />
                Generate Repair Guide
              </Button>
            </div>
          ) : (
            <RepairGuide 
              productType={data.productType} 
              issueDescription={data.issueDescription || 'General repair guidance needed'}
              repairRequestId={data.repairRequestId}
              diagnostic={data.diagnosticData}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}