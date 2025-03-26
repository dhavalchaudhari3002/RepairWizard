import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ExternalLink, Tag, Package, Award, TrendingDown, Star, BarChart3, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// This would be replaced with actual API data
interface ToolPricing {
  platform: string;
  price: number;
  url: string;
  inStock: boolean;
  freeShipping?: boolean;
  deliveryDays?: number;
}

interface ToolReview {
  platform: string;
  reviewCount: number;
  rating: number;
  positivePoints: string[];
  negativePoints: string[];
}

interface ToolItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  pricing: ToolPricing[];
  reviews: ToolReview[];
  overallRating: number;
  bestValueRating: number;  // Overall consideration of price, quality, shipping, etc.
  searchKeywords: string[]; // For more accurate search results
  similarProducts?: string[];
}

// Enhanced mock data with cross-platform pricing and reviews
const MOCK_TOOL_DATA: Record<string, ToolItem[]> = {
  "Screwdriver": [
    {
      id: "scr1",
      name: "Professional Magnetic Screwdriver Set (12-piece)",
      description: "Complete set with multiple precision heads for all repair needs. Magnetic tips hold screws securely.",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Screwdriver+Set",
      pricing: [
        { platform: "Amazon", price: 24.99, url: "https://www.amazon.com/s?k=screwdriver+set", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Home Depot", price: 26.95, url: "https://www.homedepot.com/s?keyword=screwdriver+set", inStock: true, freeShipping: false, deliveryDays: 3 },
        { platform: "Walmart", price: 22.99, url: "https://www.walmart.com/search/?query=screwdriver+set", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 1243, 
          rating: 4.7,
          positivePoints: ["Very durable", "Comfortable grip", "Excellent value"],
          negativePoints: ["Case is a bit flimsy", "One reviewer received a defective piece"]
        },
        {
          platform: "Home Depot",
          reviewCount: 567,
          rating: 4.5,
          positivePoints: ["Professional quality", "Magnetic tips work very well"],
          negativePoints: ["Slightly expensive", "Plastic parts feel cheap"]
        }
      ],
      overallRating: 4.6,
      bestValueRating: 92,
      searchKeywords: ["screwdriver set", "magnetic screwdriver", "repair tool kit"]
    },
    {
      id: "scr2",
      name: "Precision Electronics Screwdriver Kit (24-piece)",
      description: "Perfect for small electronics repairs with specialized bits for phones, laptops, and tablets",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Precision+Kit",
      pricing: [
        { platform: "Amazon", price: 19.95, url: "https://www.amazon.com/s?k=precision+electronics+screwdriver+kit", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 843, 
          rating: 4.5,
          positivePoints: ["Perfect for small electronics", "Includes even rare bit types"],
          negativePoints: ["Bits may wear out quickly with heavy use"]
        },
        {
          platform: "Best Buy",
          reviewCount: 326,
          rating: 4.3,
          positivePoints: ["Great for phone repairs", "Compact case"],
          negativePoints: ["Handle could be more comfortable"]
        }
      ],
      overallRating: 4.4,
      bestValueRating: 88,
      searchKeywords: ["electronics screwdriver", "phone repair kit", "precision screwdriver"]
    }
  ],
  "Wood glue": [
    {
      id: "glue1",
      name: "Professional Strength Wood Adhesive",
      description: "Industrial-strength wood glue that creates permanent, water-resistant bonds stronger than the wood itself",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Wood+Glue",
      pricing: [
        { platform: "Amazon", price: 8.99, url: "https://www.amazon.com/s?k=wood+glue", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 2185, 
          rating: 4.8,
          positivePoints: ["Incredibly strong bond", "Dries quickly", "Easy to use"],
          negativePoints: ["Bottle design could be improved", "Can get thick over time"]
        },
        {
          platform: "Home Depot",
          reviewCount: 893,
          rating: 4.7,
          positivePoints: ["Professional quality", "Waterproof when dry"],
          negativePoints: ["Cap tends to get stuck", "A bit expensive"]
        }
      ],
      overallRating: 4.8,
      bestValueRating: 95,
      searchKeywords: ["wood glue", "wood adhesive", "furniture repair"]
    }
  ],
  "Clamp": [
    {
      id: "clamp1",
      name: "Quick-Grip Bar Clamp Set (4-pack)",
      description: "Versatile one-handed bar clamps perfect for woodworking and furniture repairs",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Bar+Clamps",
      pricing: [
        { platform: "Amazon", price: 34.99, url: "https://www.amazon.com/s?k=bar+clamp+set", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 1546, 
          rating: 4.6,
          positivePoints: ["Very easy to use one-handed", "Sturdy construction", "Great value set"],
          negativePoints: ["Not as strong as traditional clamps", "Plastic parts may break over time"]
        },
        {
          platform: "Home Depot",
          reviewCount: 784,
          rating: 4.4,
          positivePoints: ["Perfect for DIY projects", "Easy to adjust"],
          negativePoints: ["Limited clamping force for heavy-duty work"]
        }
      ],
      overallRating: 4.5,
      bestValueRating: 87,
      searchKeywords: ["bar clamps", "woodworking clamps", "furniture repair clamps"]
    }
  ],
  "Gloves": [
    {
      id: "gloves1",
      name: "Heavy-Duty Work Gloves with Touch Screen Compatibility",
      description: "Durable work gloves that protect hands while allowing smartphone operation",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Work+Gloves",
      pricing: [
        { platform: "Amazon", price: 15.95, url: "https://www.amazon.com/s?k=work+gloves+touchscreen", inStock: true, freeShipping: true, deliveryDays: 1 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 3271, 
          rating: 4.5,
          positivePoints: ["Excellent grip", "Touchscreen actually works", "Comfortable for long periods"],
          negativePoints: ["Run slightly small", "Stitching can come loose over time"]
        },
        {
          platform: "Walmart",
          reviewCount: 1342,
          rating: 4.3,
          positivePoints: ["Great value", "Good protection"],
          negativePoints: ["Touchscreen feature works inconsistently"]
        }
      ],
      overallRating: 4.4,
      bestValueRating: 90,
      searchKeywords: ["work gloves", "touchscreen gloves", "repair gloves"]
    }
  ],
  "Sandpaper": [
    {
      id: "sp1",
      name: "Sandpaper Assortment (80-220 Grit, 36 Sheets)",
      description: "Complete set of sandpaper sheets in various grits for all wood finishing needs",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Sandpaper",
      pricing: [
        { platform: "Amazon", price: 12.99, url: "https://www.amazon.com/s?k=sandpaper+assortment", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 968, 
          rating: 4.7,
          positivePoints: ["Great selection of grits", "Consistent quality", "Lasts a long time"],
          negativePoints: ["Packaging could be better organized", "Some sheets may tear easily"]
        },
        {
          platform: "Home Depot",
          reviewCount: 415,
          rating: 4.5,
          positivePoints: ["Professional quality", "Works well on various woods"],
          negativePoints: ["A bit expensive compared to bulk packs"]
        }
      ],
      overallRating: 4.6,
      bestValueRating: 92,
      searchKeywords: ["sandpaper", "wood sanding", "furniture refinishing"]
    }
  ],
  "Paint or varnish": [
    {
      id: "paint1",
      name: "Premium Furniture Touch-Up Kit with 6 Wood Shades",
      description: "Complete repair kit with 6 wood-tone markers and fill sticks for furniture touch-ups",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Touch+Up+Kit",
      pricing: [
        { platform: "Amazon", price: 19.99, url: "https://www.amazon.com/s?k=furniture+touch+up+kit", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 3682, 
          rating: 4.5,
          positivePoints: ["Great color selection", "Easy to use", "Makes scratches disappear"],
          negativePoints: ["Colors may not match exactly", "Wax filler needs frequent reapplication"]
        },
        {
          platform: "Home Depot",
          reviewCount: 572,
          rating: 4.3,
          positivePoints: ["Works on most wood furniture", "Good value"],
          negativePoints: ["Not suitable for deep scratches", "Markers can dry out"]
        }
      ],
      overallRating: 4.4,
      bestValueRating: 88,
      searchKeywords: ["furniture touch up", "wood repair kit", "furniture markers"]
    }
  ],
  "Paintbrush": [
    {
      id: "brush1",
      name: "Fine Detail Paint Brush Set (12-piece)",
      description: "Professional-grade fine tip brushes perfect for furniture touch-ups and detailing",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Paintbrushes",
      pricing: [
        { platform: "Amazon", price: 12.95, url: "https://www.amazon.com/s?k=detail+paint+brush+set", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 1872, 
          rating: 4.6,
          positivePoints: ["Excellent for detailed work", "Brushes keep their shape", "No bristle shedding"],
          negativePoints: ["Handle paint can chip", "Not ideal for large surface areas"]
        },
        {
          platform: "Michaels",
          reviewCount: 352,
          rating: 4.4,
          positivePoints: ["Professional quality", "Works with multiple paint types"],
          negativePoints: ["A bit expensive", "Some brushes are very similar sizes"]
        }
      ],
      overallRating: 4.5,
      bestValueRating: 91,
      searchKeywords: ["detail paintbrushes", "furniture painting", "fine brushes"]
    }
  ],
  "Mask": [
    {
      id: "mask1",
      name: "N95 Dust Masks with Exhalation Valve (10-pack)",
      description: "Comfortable respirator masks that filter dust and particles during sanding and painting",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=N95+Masks",
      pricing: [
        { platform: "Amazon", price: 16.99, url: "https://www.amazon.com/s?k=n95+dust+mask+valve", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 4326, 
          rating: 4.7,
          positivePoints: ["Excellent dust protection", "Comfortable for extended wear", "Valve prevents glasses fogging"],
          negativePoints: ["Elastic can wear out", "Slightly bulky"]
        },
        {
          platform: "Home Depot",
          reviewCount: 893,
          rating: 4.6,
          positivePoints: ["Professional grade", "Easy to breathe through"],
          negativePoints: ["Sizing runs small", "Nose piece could be more flexible"]
        }
      ],
      overallRating: 4.7,
      bestValueRating: 94,
      searchKeywords: ["dust masks", "n95 respirator", "sanding protection"]
    }
  ],
  "Flashlight": [
    {
      id: "fl1",
      name: "Professional LED Inspection Flashlight",
      description: "Bright LED flashlight with adjustable focus and magnetic base for hands-free use",
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=LED+Flashlight",
      pricing: [
        { platform: "Amazon", price: 12.95, url: "https://www.amazon.com/s?k=magnetic+led+inspection+flashlight", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Home Depot", price: 15.49, url: "https://www.homedepot.com/s?keyword=led+flashlight", inStock: true, freeShipping: false, deliveryDays: 3 },
        { platform: "Walmart", price: 11.99, url: "https://www.walmart.com/search/?query=led+flashlight", inStock: true, freeShipping: true, deliveryDays: 2 }
      ],
      reviews: [
        { 
          platform: "Amazon", 
          reviewCount: 2548, 
          rating: 4.4,
          positivePoints: ["Extremely bright", "Magnetic base is very useful", "Long battery life"],
          negativePoints: ["Switch can be finicky", "Focus adjustment can be stiff"]
        },
        {
          platform: "Home Depot",
          reviewCount: 683,
          rating: 4.3,
          positivePoints: ["Great for repairs in dark areas", "Comfortable grip"],
          negativePoints: ["Battery compartment difficult to open", "Can get hot after extended use"]
        }
      ],
      overallRating: 4.4,
      bestValueRating: 89,
      searchKeywords: ["inspection flashlight", "magnetic led light", "repair light"]
    }
  ]
};

// Map general tool names to specific tool names in our database
const TOOL_NAME_MAPPING: Record<string, string[]> = {
  "Screwdriver": ["Screwdriver", "Phillips screwdriver", "Flathead screwdriver"],
  "Wood glue": ["Wood glue", "Glue"],
  "Clamp": ["Clamp"],
  "Gloves": ["Gloves", "Work gloves", "Anti-static gloves"],
  "Sandpaper": ["Sandpaper"],
  "Paint or varnish": ["Paint or varnish", "Paint", "Varnish"],
  "Paintbrush": ["Paintbrush", "Brush"],
  "Mask": ["Mask", "Dust mask"],
  "Flashlight": ["Flashlight"],
  "Precision screwdriver": ["Precision screwdriver", "Phone repair screwdriver set"],
  "Spudger": ["Spudger", "Plastic opening tool", "Pry tool"],
  "Tweezers": ["Tweezers", "ESD tweezers"],
  "Heat gun": ["Heat gun", "Heat plate", "Hair dryer"],
  "Suction cup": ["Suction cup", "Screen removal tool"],
  "Opening picks": ["Opening picks", "Guitar picks", "Plastic picks"]
};

interface RepairToolsShoppingProps {
  tools: string[];
  isVisible: boolean;
}

export function RepairToolsShopping({ tools, isVisible }: RepairToolsShoppingProps) {
  const [toolItems, setToolItems] = useState<ToolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQueryStarted, setSearchQueryStarted] = useState(false);

  useEffect(() => {
    if (!isVisible || !tools.length) return;
    
    // Simulate the "searching across platforms" experience
    setIsLoading(true);
    
    // Using mock data - in production this would be an API call
    setTimeout(() => {
      // Filter tools based on the tools array passed to the component
      const relevantTools: ToolItem[] = [];
      
      // Look through each tool in the passed array and find matching tools
      tools.forEach(toolName => {
        // Try to find the tool in our mapping (normalize tool names)
        const matchingToolNames = Object.entries(TOOL_NAME_MAPPING).find(
          ([_, aliases]) => aliases.some(alias => 
            alias.toLowerCase() === toolName.toLowerCase()
          )
        );
        
        // If we found a matching tool category
        if (matchingToolNames && MOCK_TOOL_DATA[matchingToolNames[0]]) {
          // Add the first tool from that category if not already added
          const toolToAdd = MOCK_TOOL_DATA[matchingToolNames[0]][0];
          if (!relevantTools.some(t => t.id === toolToAdd.id)) {
            relevantTools.push(toolToAdd);
          }
        }
      });
      
      setToolItems(relevantTools);
      setIsLoading(false);
    }, 1000);
  }, [isVisible, tools]);

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <Card className="w-full shadow-md border-primary/10 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Finding Recommended Tools...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4 animate-pulse" />
                <span>Searching for tools matching your repair...</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3 border rounded-lg p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-24 w-24 rounded-md flex-shrink-0" />
                    <div className="flex-grow space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-5/6" />
                      <div className="flex justify-between pt-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
          Recommended Repair Tools
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tools you might need for this repair
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-8">
          {toolItems.map((tool) => {
            // Find the lowest price across all platforms
            const lowestPrice = Math.min(...tool.pricing.map(p => p.price));
            const bestPriceOffer = tool.pricing.find(p => p.price === lowestPrice);
            
            // Calculate average rating
            const avgRating = tool.overallRating;
            
            // Find fastest shipping option
            const fastestShipping = [...tool.pricing].sort((a, b) => 
              (a.deliveryDays || 999) - (b.deliveryDays || 999)
            )[0];

            return (
              <div key={tool.id} className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted/30">
                  <div className="flex flex-col md:flex-row gap-4">
                    {tool.imageUrl && (
                      <div className="flex-shrink-0">
                        <img 
                          src={tool.imageUrl} 
                          alt={tool.name} 
                          className="w-full md:w-32 h-32 object-cover rounded-md"
                        />
                      </div>
                    )}
                    
                    <div className="flex-grow space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-medium text-lg">{tool.name}</h3>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 stroke-yellow-500" />
                          {avgRating.toFixed(1)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center">
                          <span className="font-semibold text-lg text-primary">
                            ${lowestPrice.toFixed(2)}
                          </span>
                          <Badge className="ml-2" variant="outline">
                            Best Price
                          </Badge>
                        </div>
                        
                        <a
                          href={bestPriceOffer?.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm flex items-center gap-1"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Available online
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Button variant="secondary" className="w-full" asChild>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(tools.join(' repair tools'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search for additional tools online
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}