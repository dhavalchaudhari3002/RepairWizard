import { RepairForm } from "@/components/repair-form";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Wrench className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Repair Assistant</h1>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <RepairForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
