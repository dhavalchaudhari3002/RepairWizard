import { useState } from "react";
import { RepairForm } from "@/components/repair-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { ProductRecommendations } from "@/components/product-recommendations";
import { RepairGuidance } from "@/components/repair-guidance";
import { RepairShops } from "@/components/repair-shops";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [repairRequestId, setRepairRequestId] = useState<number | null>(null);
  const [repairData, setRepairData] = useState<any>(null);
  const [, navigate] = useLocation();

  const handleRepairSubmit = (data: any) => {
    setRepairData(data);
    // Assuming the repair request creation returns an ID
    setRepairRequestId(1); // For now, hardcoding to 1 since we have sample data
  };
  
  // Using a direct approach without relying on URL parameters
  const goToAuth = () => {
    // First navigate to the auth page
    navigate("/auth");
    
    // Then set a flag in localStorage to indicate dialog should be opened
    localStorage.setItem("openAuthDialog", "true");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wrench className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">AI Repair Assistant</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your intelligent repair companion. Get expert guidance, cost
            estimates, and step-by-step solutions for any repair need.
          </p>
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg"
            onClick={goToAuth}
          >
            Get Started
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 p-2 rounded-full">🔍</span>
                Smart Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              Advanced AI analysis to identify problems accurately
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 p-2 rounded-full">📋</span>
                Expert Guidance
              </CardTitle>
            </CardHeader>
            <CardContent>
              Step-by-step repair instructions and professional tips
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 p-2 rounded-full">💰</span>
                Cost Estimates
              </CardTitle>
            </CardHeader>
            <CardContent>
              Accurate repair cost predictions and comparisons
            </CardContent>
          </Card>
        </div>

        {/* This is the existing form and data section, only shown if user has submitted data */}
        {repairData && (
          <div className="grid gap-8">
            <RepairGuidance data={repairData} />
            {repairRequestId && (
              <ProductRecommendations repairRequestId={repairRequestId} />
            )}
            <RepairShops />
          </div>
        )}
      </div>
    </div>
  );
}