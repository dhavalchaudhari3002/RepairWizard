import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ExternalLink, Tag, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// This would be replaced with actual API data
interface ToolItem {
  id: string;
  name: string;
  price: number;
  rating: number;
  description: string;
  imageUrl?: string;
  platform: string;
  url: string;
}

// Mock data for tools to purchase - would be replaced with real API integration
const MOCK_TOOL_DATA: Record<string, ToolItem[]> = {
  "Screwdriver": [
    {
      id: "scr1",
      name: "Professional Screwdriver Set",
      price: 24.99,
      rating: 4.7,
      description: "Complete set with multiple heads for all repair needs",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Screwdriver+Set",
      platform: "Amazon",
      url: "https://amazon.com/example",
    },
    {
      id: "scr2",
      name: "Precision Screwdriver Kit",
      price: 19.95,
      rating: 4.5,
      description: "Perfect for small electronics repairs",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Precision+Kit",
      platform: "eBay",
      url: "https://ebay.com/example",
    }
  ],
  "Hammer": [
    {
      id: "ham1",
      name: "Claw Hammer",
      price: 15.99,
      rating: 4.6,
      description: "Multi-purpose hammer with steel construction",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Claw+Hammer",
      platform: "Amazon",
      url: "https://amazon.com/example",
    }
  ],
  "Glue": [
    {
      id: "glue1",
      name: "Super Strength Adhesive",
      price: 7.99,
      rating: 4.8,
      description: "Fast-bonding glue for almost any material",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Super+Glue",
      platform: "Amazon",
      url: "https://amazon.com/example",
    }
  ],
  "Flashlight": [
    {
      id: "fl1",
      name: "LED Inspection Flashlight",
      price: 12.95,
      rating: 4.4,
      description: "Bright LED flashlight with adjustable focus",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=LED+Flashlight",
      platform: "Amazon",
      url: "https://amazon.com/example",
    }
  ],
  "Replacement parts": [
    {
      id: "rp1",
      name: "Universal Replacement Kit",
      price: 29.99,
      rating: 4.2,
      description: "Set of common replacement parts for various repairs",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Parts+Kit",
      platform: "Amazon",
      url: "https://amazon.com/example",
    }
  ],
  "Needle and thread": [
    {
      id: "nt1",
      name: "Upholstery Repair Kit",
      price: 16.99,
      rating: 4.5,
      description: "Complete upholstery repair kit with strong needles and thread",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Sewing+Kit",
      platform: "Amazon",
      url: "https://amazon.com/example",
    }
  ],
  "Upholstery cleaner": [
    {
      id: "uc1",
      name: "Professional Upholstery Cleaner",
      price: 14.95,
      rating: 4.7,
      description: "Stain-fighting formula safe for all fabric types",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Cleaner",
      platform: "Amazon",
      url: "https://amazon.com/example",
    }
  ]
};

interface RepairToolsShoppingProps {
  tools: string[];
  isVisible: boolean;
}

export function RepairToolsShopping({ tools, isVisible }: RepairToolsShoppingProps) {
  const [toolItems, setToolItems] = useState<ToolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isVisible) return;
    
    // Simulates loading tool data from an API
    setIsLoading(true);
    
    // Using mock data - in production this would be an API call
    setTimeout(() => {
      const items: ToolItem[] = [];
      tools.forEach(tool => {
        const toolOptions = MOCK_TOOL_DATA[tool];
        if (toolOptions) {
          // Add the best option for each tool
          items.push(toolOptions[0]);
        }
      });
      
      setToolItems(items);
      setIsLoading(false);
    }, 1000);
  }, [tools, isVisible]);

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <Card className="w-full shadow-md border-primary/10 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Loading Repair Tools...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-36 rounded-lg" />
              <Skeleton className="h-36 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!toolItems.length) {
    return (
      <Card className="w-full shadow-md border-primary/10 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Repair Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No specialized tools needed for this repair.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-md border-primary/10 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Buy Repair Tools
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Purchase the tools you need for this repair from trusted retailers
        </p>

        <ScrollArea className="h-[420px] pr-4">
          <div className="space-y-6">
            {toolItems.map((tool) => (
              <div 
                key={tool.id} 
                className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                {tool.imageUrl && (
                  <div className="flex-shrink-0">
                    <img 
                      src={tool.imageUrl} 
                      alt={tool.name} 
                      className="w-28 h-28 object-cover rounded-md"
                    />
                  </div>
                )}
                
                <div className="flex-grow space-y-2">
                  <div className="flex flex-wrap items-start justify-between">
                    <h3 className="font-medium">{tool.name}</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {tool.rating} ★
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4" />
                    <span className="font-semibold text-base">${tool.price.toFixed(2)}</span>
                    
                    <span className="text-muted-foreground ml-1">on {tool.platform}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 justify-center mt-3 md:mt-0">
                  <Button asChild>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Buy Now
                    </a>
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(tool.name + " reviews")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Read Reviews
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="border-t mt-6 pt-4">
          <Button variant="secondary" className="w-full" asChild>
            <a
              href={`https://www.amazon.com/s?k=${encodeURIComponent(tools.join('+'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Package className="h-4 w-4" />
              See All Required Tools on Amazon
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}