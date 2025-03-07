import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, ExternalLink, ShoppingCart, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Product, ProductPrice, ProductReview } from "@shared/schema";

interface ProductRecommendationProps {
  repairRequestId: number;
}

interface RecommendedProduct extends Product {
  prices: ProductPrice[];
  reviews: ProductReview[];
  reason: string;
}

export function ProductRecommendations({ repairRequestId }: ProductRecommendationProps) {
  const { data: recommendations = [], isLoading } = useQuery<RecommendedProduct[]>({
    queryKey: ['/api/recommendations', repairRequestId],
    enabled: !!repairRequestId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
      </div>
    );
  }

  if (!recommendations.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Recommendations</CardTitle>
          <CardDescription>
            No recommendations available at this time.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recommended Products</h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((product: RecommendedProduct) => {
          const lowestPrice = Math.min(...product.prices.map(p => Number(p.price)));
          const averageRating = product.reviews.reduce((acc, rev) => acc + Number(rev.rating), 0) / product.reviews.length;

          return (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>{product.name}</span>
                  <Badge variant="secondary">
                    {averageRating.toFixed(1)}
                    <Star className="h-4 w-4 ml-1 fill-current" />
                  </Badge>
                </CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-contain rounded-md bg-background"
                  />
                )}

                <div className="space-y-2">
                  <p className="font-medium">Why we recommend this:</p>
                  <p className="text-sm text-muted-foreground">{product.reason}</p>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">Price Comparison:</p>
                  <ScrollArea className="h-32">
                    {product.prices.map((price) => (
                      <div
                        key={`${price.platform}-${price.id}`}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm">{price.platform}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            ${Number(price.price).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                          >
                            <a
                              href={price.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">View on {price.platform}</span>
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">Review Summary:</p>
                  <ScrollArea className="h-32">
                    {product.reviews.map((review) => (
                      <div key={`${review.platform}-${review.id}`} className="space-y-2 py-2 border-b last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{review.platform}</span>
                          <Badge variant="outline">
                            {review.reviewCount} reviews
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-start gap-2">
                            <ThumbsUp className="h-4 w-4 text-green-500 mt-1" />
                            <ul className="text-sm list-disc list-inside">
                              {review.positivePoints?.slice(0, 2).map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex items-start gap-2">
                            <ThumbsDown className="h-4 w-4 text-red-500 mt-1" />
                            <ul className="text-sm list-disc list-inside">
                              {review.negativePoints?.slice(0, 2).map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </CardContent>

              <CardFooter>
                <Button className="w-full" asChild>
                  <a
                    href={product.prices.find(p => Number(p.price) === lowestPrice)?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy for ${lowestPrice.toFixed(2)}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}