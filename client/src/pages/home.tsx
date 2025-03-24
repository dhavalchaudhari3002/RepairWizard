import { useState } from "react";
import { RepairForm } from "@/components/repair-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { ProductRecommendations } from "@/components/product-recommendations";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [repairRequestId, setRepairRequestId] = useState<number | null>(null);
  const [repairData, setRepairData] = useState<any>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth(); // Get authentication status

  const handleRepairSubmit = (data: any) => {
    setRepairData(data);
    setFormSubmitted(true);
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
        {user ? (
          // Content for authenticated users - show the repair form directly
          <div>
            <div className="flex items-center justify-center gap-3 mb-8 text-center">
              <Wrench className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold">Smart Repair Partner</h1>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Submit a Repair Request</CardTitle>
                  <CardDescription>
                    Tell us about the device you need help with
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RepairForm 
                    onSubmit={handleRepairSubmit} 
                    onResetForm={() => setFormSubmitted(false)} 
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Content for unauthenticated users - show the hero and features sections
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Wrench className="h-10 w-10 text-primary" />
                <h1 className="text-4xl font-bold">Smart Repair Partner</h1>
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
          </>
        )}
      </div>
    </div>
  );
}