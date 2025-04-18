import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

// Define the interface for tool data
interface Tool {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  amazonUrl: string;
}

// Define the interface for component props
interface ToolListProps {
  taskType: string;
  tools: Tool[];
}

export function ToolList({ taskType, tools }: ToolListProps) {
  return (
    <Card className="w-full shadow-md border-primary/10 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Essential Tools for {taskType}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {tools.map((tool, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {tool.imageUrl && (
                    <div className="flex-shrink-0">
                      <a
                        href={tool.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img 
                          src={tool.imageUrl} 
                          alt={tool.name} 
                          className="w-full md:w-32 h-32 object-cover rounded-md"
                        />
                      </a>
                    </div>
                  )}
                  
                  <div className="flex-grow space-y-2">
                    <h3 className="font-medium text-lg">
                      <a
                        href={tool.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        {tool.name}
                      </a>
                    </h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-semibold text-lg text-primary">
                        ${tool.price.toFixed(2)}
                      </span>
                      
                      <a
                        href={tool.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm flex items-center gap-1"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Available on Amazon
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}