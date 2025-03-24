import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Star, Loader2 } from "lucide-react";
import { RepairQuestions } from "./repair-questions";
import { RepairGuide } from "./repair-guide";
import { type RepairShop } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface RepairGuidanceData {
  productType: string;
  issueDescription?: string;
  commonIssues: string[];
  recommendations: string[];
}

export function RepairGuidance({ data }: { data: RepairGuidanceData }) {
  // Fetch repair shops
  const { data: shops, isLoading } = useQuery<RepairShop[]>({
    queryKey: ["/api/repair-shops"],
  });

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
          
          {/* Repair Shops Section */}
          <div className="pt-4">
            <h3 className="font-semibold mb-2">Recommended Repair Shops</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shops && shops.length > 0 ? (
              <div className="space-y-4">
                {shops.map((shop) => (
                  <div key={shop.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{shop.name}</h4>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" fill="currentColor" />
                        <span className="text-sm">{shop.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{shop.description}</p>
                    <div className="text-xs text-muted-foreground">
                      <p>{shop.address}</p>
                      <p>{shop.phoneNumber}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {shop.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No repair shops found in your area.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Repair Guide Component */}
      <RepairGuide 
        productType={data.productType} 
        issue={data.issueDescription || 'General repair guidance needed'} 
      />
      
      {/* Repair Questions Component */}
      <Card>
        <CardHeader>
          <CardTitle>Have Questions?</CardTitle>
          <CardDescription>Ask our AI about your repair needs</CardDescription>
        </CardHeader>
        <CardContent>
          <RepairQuestions 
            productType={data.productType}
            issueDescription={data.issueDescription}
          />
        </CardContent>
      </Card>
    </div>
  );
}