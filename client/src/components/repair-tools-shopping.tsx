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
        { platform: "Home Depot", price: 27.95, url: "https://www.homedepot.com/b/Tools-Hand-Tools-Screwdrivers-Nut-Drivers/N-5yc1vZc22k", inStock: true, freeShipping: true, deliveryDays: 3 },
        { platform: "eBay", price: 22.50, url: "https://www.ebay.com/sch/i.html?_nkw=screwdriver+set", inStock: true, freeShipping: false, deliveryDays: 5 },
        { platform: "Walmart", price: 23.99, url: "https://www.walmart.com/browse/tools/screwdrivers-nutdrivers/1072864_1031899_1067612", inStock: true, freeShipping: true, deliveryDays: 2 }
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
        { platform: "Amazon", price: 19.95, url: "https://www.amazon.com/s?k=precision+electronics+screwdriver+kit", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Best Buy", price: 22.99, url: "https://www.bestbuy.com/site/tools-hardware", inStock: true, freeShipping: true, deliveryDays: 1 },
        { platform: "eBay", price: 17.50, url: "https://www.ebay.com/sch/i.html?_nkw=electronics+repair+kit", inStock: true, freeShipping: false, deliveryDays: 5 }
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
        { platform: "Amazon", price: 8.99, url: "https://www.amazon.com/s?k=wood+glue", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Home Depot", price: 7.95, url: "https://www.homedepot.com/b/Paint-Paint-Supplies-Glue-Wood-Glue/N-5yc1vZbqnv", inStock: true, freeShipping: false, deliveryDays: 1 },
        { platform: "Lowe's", price: 8.49, url: "https://www.lowes.com/pl/Wood-glue-Glues-adhesives-Paint/4294512322", inStock: true, freeShipping: false, deliveryDays: 1 },
        { platform: "Walmart", price: 7.49, url: "https://www.walmart.com/browse/arts-crafts-sewing/wood-glue/1334134_6355365_1285274", inStock: true, freeShipping: true, deliveryDays: 3 }
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
        { platform: "Amazon", price: 34.99, url: "https://amazon.com/example", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Home Depot", price: 39.95, url: "https://homedepot.com/example", inStock: true, freeShipping: true, deliveryDays: 1 },
        { platform: "Lowe's", price: 32.49, url: "https://lowes.com/example", inStock: true, freeShipping: true, deliveryDays: 1 },
        { platform: "Harbor Freight", price: 29.99, url: "https://harborfreight.com/example", inStock: true, freeShipping: false, deliveryDays: 4 }
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
        { platform: "Amazon", price: 15.95, url: "https://amazon.com/example", inStock: true, freeShipping: true, deliveryDays: 1 },
        { platform: "Home Depot", price: 17.49, url: "https://homedepot.com/example", inStock: true, freeShipping: false, deliveryDays: 1 },
        { platform: "Walmart", price: 14.97, url: "https://walmart.com/example", inStock: true, freeShipping: true, deliveryDays: 2 }
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
        { platform: "Amazon", price: 12.99, url: "https://amazon.com/example", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Home Depot", price: 14.95, url: "https://homedepot.com/example", inStock: true, freeShipping: false, deliveryDays: 1 },
        { platform: "Lowe's", price: 13.49, url: "https://lowes.com/example", inStock: true, freeShipping: false, deliveryDays: 1 }
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
        { platform: "Amazon", price: 19.99, url: "https://www.amazon.com/s?k=furniture+touch+up+kit", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Walmart", price: 22.95, url: "https://www.walmart.com/browse/home-improvement/furniture-touch-up/1072864_1067617_1230932", inStock: true, freeShipping: true, deliveryDays: 3 },
        { platform: "Home Depot", price: 21.49, url: "https://www.homedepot.com/b/Paint-Stains-Finishes-Furniture-Touch-Up/N-5yc1vZ1z18g83", inStock: true, freeShipping: false, deliveryDays: 1 }
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
        { platform: "Amazon", price: 12.95, url: "https://amazon.com/example", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Michaels", price: 16.99, url: "https://michaels.com/example", inStock: true, freeShipping: false, deliveryDays: 3 },
        { platform: "Walmart", price: 14.49, url: "https://walmart.com/example", inStock: true, freeShipping: true, deliveryDays: 2 }
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
        { platform: "Amazon", price: 16.99, url: "https://amazon.com/example", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Home Depot", price: 18.95, url: "https://homedepot.com/example", inStock: true, freeShipping: false, deliveryDays: 1 },
        { platform: "Walmart", price: 15.99, url: "https://walmart.com/example", inStock: true, freeShipping: true, deliveryDays: 3 }
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
        { platform: "Amazon", price: 12.95, url: "https://amazon.com/example", inStock: true, freeShipping: true, deliveryDays: 2 },
        { platform: "Home Depot", price: 14.99, url: "https://homedepot.com/example", inStock: true, freeShipping: false, deliveryDays: 1 },
        { platform: "Walmart", price: 11.99, url: "https://walmart.com/example", inStock: true, freeShipping: true, deliveryDays: 2 }
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
  "Screwdriver": ["Screwdriver"],
  "Wood glue": ["Wood glue", "Glue"],
  "Clamp": ["Clamp"],
  "Gloves": ["Gloves"],
  "Sandpaper": ["Sandpaper"],
  "Paint or varnish": ["Paint or varnish", "Paint", "Varnish"],
  "Paintbrush": ["Paintbrush", "Brush"],
  "Mask": ["Mask", "Dust mask"],
  "Flashlight": ["Flashlight"]
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
    if (!isVisible) return;
    
    // Simulate the "searching across platforms" experience
    setIsLoading(true);
    setSearchQueryStarted(true);
    
    // Using mock data - in production this would be an API call
    setTimeout(() => {
      const items: ToolItem[] = [];
      
      // Map the general tool names to our specific tool database entries
      tools.forEach(toolName => {
        // Find all possible mappings for this tool
        let mappings: string[] = [];
        for (const [key, values] of Object.entries(TOOL_NAME_MAPPING)) {
          if (values.some(value => 
            toolName.toLowerCase().includes(value.toLowerCase()) || 
            value.toLowerCase().includes(toolName.toLowerCase())
          )) {
            mappings.push(key);
          }
        }
        
        // If no mappings found, add the original name
        if (mappings.length === 0) {
          mappings = [toolName];
        }
        
        // Find tools that match any of the mappings
        mappings.forEach(mapping => {
          const toolOptions = MOCK_TOOL_DATA[mapping];
          if (toolOptions && toolOptions.length > 0) {
            // Only add if we don't already have this tool
            if (!items.some(item => item.id === toolOptions[0].id)) {
              items.push(toolOptions[0]);
            }
          }
        });
      });
      
      // Sort by best value rating (highest first)
      const sortedItems = [...items].sort((a, b) => b.bestValueRating - a.bestValueRating);
      
      setToolItems(sortedItems);
      setIsLoading(false);
    }, 2000); // Longer delay to simulate a thorough search
  }, [tools, isVisible]);

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <Card className="w-full shadow-md border-primary/10 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Finding the Best Deals on Repair Tools...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {searchQueryStarted ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Search className="h-4 w-4 animate-pulse" />
                    <span>Searching across multiple retailers...</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3 border rounded-lg p-4">
                      <Skeleton className="h-24 w-full rounded-md" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-5/6" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Search className="h-10 w-10 mx-auto animate-pulse text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Preparing to search for the best tool deals...</p>
                </div>
              </div>
            )}
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
          Best Deals on Repair Tools
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          We've compared prices across multiple retailers to find you the best deals
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
                        <Badge className="flex items-center gap-1">
                          {tool.bestValueRating}% <Award className="h-3 w-3 ml-1" /> Value
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                      
                      <div className="flex flex-wrap gap-3 pt-1">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 stroke-yellow-500" />
                          {avgRating.toFixed(1)} ({tool.reviews.reduce((sum, r) => sum + r.reviewCount, 0)} reviews)
                        </Badge>
                        
                        <Badge variant="outline" className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-green-500" />
                          Best price: ${lowestPrice.toFixed(2)} at {bestPriceOffer?.platform}
                        </Badge>
                        
                        {fastestShipping && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Fastest delivery: {fastestShipping.deliveryDays} day{fastestShipping.deliveryDays !== 1 ? 's' : ''} ({fastestShipping.platform})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Tabs defaultValue="pricing">
                  <div className="border-b px-4">
                    <TabsList className="w-full justify-start h-12 rounded-none bg-transparent pl-0 ml-0">
                      <TabsTrigger value="pricing" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                        Pricing Comparison
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                        Reviews
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="pricing" className="p-4 space-y-4">
                    <div className="grid gap-3">
                      {tool.pricing.map((priceOffer, idx) => (
                        <div 
                          key={`${priceOffer.platform}-${idx}`} 
                          className={`flex items-center justify-between p-3 rounded-lg ${priceOffer.price === lowestPrice ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900' : 'border'}`}
                        >
                          <div className="flex items-center gap-3">
                            {priceOffer.price === lowestPrice && (
                              <Badge className="bg-green-600">Best Price</Badge>
                            )}
                            <div>
                              <p className="font-medium">{priceOffer.platform}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {priceOffer.freeShipping && <span>Free shipping</span>}
                                {priceOffer.deliveryDays && (
                                  <span>{priceOffer.deliveryDays} day{priceOffer.deliveryDays !== 1 ? 's' : ''} delivery</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <p className={`font-semibold text-lg ${priceOffer.price === lowestPrice ? 'text-green-600 dark:text-green-400' : ''}`}>
                              ${priceOffer.price.toFixed(2)}
                            </p>
                            <Button size="sm" asChild>
                              <a
                                href={priceOffer.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2"
                              >
                                {priceOffer.price === lowestPrice ? (
                                  <>
                                    <ShoppingCart className="h-4 w-4" />
                                    Buy Now
                                  </>
                                ) : "View"}
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="reviews" className="p-4 space-y-4">
                    <div className="flex flex-col gap-1 mb-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-500 stroke-yellow-500" />
                        <span className="font-medium text-lg">{avgRating.toFixed(1)} out of 5</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Based on {tool.reviews.reduce((sum, r) => sum + r.reviewCount, 0)} reviews across {tool.reviews.length} platforms
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      {tool.reviews.map((review, idx) => (
                        <div key={`${review.platform}-${idx}`} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-medium">{review.platform} Reviews</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-500 stroke-yellow-500" />
                              <span className="font-medium">{review.rating}</span>
                              <span className="text-sm text-muted-foreground">({review.reviewCount})</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
                                </svg>
                                Pros
                              </h5>
                              <ul className="space-y-1">
                                {review.positivePoints.map((point, i) => (
                                  <li key={i} className="text-sm flex items-start gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5">
                                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                    </svg>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-.53 14.03a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V8.25a.75.75 0 00-1.5 0v5.69l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3z" clipRule="evenodd" />
                                </svg>
                                Cons
                              </h5>
                              <ul className="space-y-1">
                                {review.negativePoints.map((point, i) => (
                                  <li key={i} className="text-sm flex items-start gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                    </svg>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t">
                            <Button variant="outline" size="sm" asChild className="w-full">
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(tool.name + " reviews " + review.platform)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Read more reviews on {review.platform}
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="p-4 border-t">
                  <Button className="w-full" asChild>
                    <a
                      href={bestPriceOffer?.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Buy for ${lowestPrice.toFixed(2)} at {bestPriceOffer?.platform}
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Button variant="secondary" className="w-full" asChild>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent('buy ' + tools.join(' '))}&tbm=shop`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search for more tools and compare prices
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}