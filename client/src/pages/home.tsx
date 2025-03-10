import { useState } from "react";
import { RepairForm } from "@/components/repair-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { ProductRecommendations } from "@/components/product-recommendations";
import { RepairGuidance } from "@/components/repair-guidance";
import { RepairShops } from "@/components/repair-shops";

export default function Home() {
  const [repairRequestId, setRepairRequestId] = useState<number | null>(null);
  const [repairData, setRepairData] = useState<any>(null);

  const handleRepairSubmit = (data: any) => {
    setRepairData(data);
    // Assuming the repair request creation returns an ID
    setRepairRequestId(1); // For now, hardcoding to 1 since we have sample data
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Wrench className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Repair Assistant</h1>
        </div>

        <div className="grid gap-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Describe your repair needs and get personalized AI-powered guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RepairForm onSubmit={handleRepairSubmit} />
            </CardContent>
          </Card>

          {repairData && (
            <>
              <RepairGuidance data={repairData} />

              {repairRequestId && (
                <ProductRecommendations repairRequestId={repairRequestId} />
              )}

              <RepairShops />
            </>
          )}
        </div>
      </div>
    </div>
  );
}