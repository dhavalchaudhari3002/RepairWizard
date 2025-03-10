import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  products,
  productPrices,
  productReviews,
  productRecommendations,
  type Product,
  type ProductPrice,
  type ProductReview,
  type ProductRecommendation,
} from "@shared/schema";

interface BestValueProduct extends Product {
  prices: ProductPrice[];
  reviews: ProductReview[];
  reason: string;
  valueScore: number;
  bestPrice: {
    price: number;
    platform: string;
    url: string;
  };
}

export async function getProductRecommendations(repairRequestId: number) {
  const recommendations = await db
    .select()
    .from(productRecommendations)
    .where(eq(productRecommendations.repairRequestId, repairRequestId))
    .orderBy(productRecommendations.priority);

  const recommendedProducts = await Promise.all(
    recommendations.map(async (rec) => {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, rec.productId))
        .then((res) => res[0]);

      const prices = await db
        .select()
        .from(productPrices)
        .where(eq(productPrices.productId, rec.productId))
        .orderBy(desc(productPrices.lastChecked));

      const reviews = await db
        .select()
        .from(productReviews)
        .where(eq(productReviews.productId, rec.productId));

      // Calculate the value score based on price and rating
      const avgRating = reviews.reduce((acc, rev) => acc + Number(rev.rating), 0) / reviews.length;
      const lowestPrice = Math.min(...prices.map(p => Number(p.price)));
      const bestPriceListing = prices.find(p => Number(p.price) === lowestPrice);

      // Value score calculation: higher rating and lower price = better score
      // Normalized to a 0-100 scale
      const valueScore = ((avgRating / 5) * 50) + ((1 - (lowestPrice / 1000)) * 50);

      return {
        ...product,
        prices,
        reviews,
        reason: rec.reason,
        valueScore,
        bestPrice: {
          price: lowestPrice,
          platform: bestPriceListing?.platform || '',
          url: bestPriceListing?.url || '',
        },
      };
    })
  );

  // Sort by value score, highest first
  return recommendedProducts.sort((a, b) => b.valueScore - a.valueScore);
}

// Mock data for development - replace with real API integrations later
export async function updateProductPrices(productId: number) {
  // TODO: Integrate with real price comparison APIs
  const mockPrices = [
    {
      platform: "Amazon",
      price: "29.99",
      currency: "USD",
      url: "https://amazon.com/example",
    },
    {
      platform: "eBay",
      price: "27.50",
      currency: "USD",
      url: "https://ebay.com/example",
    },
    {
      platform: "Walmart",
      price: "32.99",
      currency: "USD",
      url: "https://walmart.com/example",
    },
  ];

  await Promise.all(
    mockPrices.map((price) =>
      db
        .insert(productPrices)
        .values({
          productId,
          ...price,
          inStock: true,
          lastChecked: new Date(),
        })
        .onConflictDoUpdate({
          target: [productPrices.productId, productPrices.platform],
          set: {
            price: price.price,
            inStock: true,
            lastChecked: new Date(),
          },
        })
    )
  );
}

export async function updateProductReviews(productId: number) {
  // TODO: Integrate with real review aggregation APIs
  const mockReviews = [
    {
      platform: "Amazon",
      rating: "4.5",
      reviewCount: 128,
      positivePoints: [
        "Great quality for the price",
        "Easy to install",
      ],
      negativePoints: [
        "Packaging could be better",
        "Shipping took longer than expected",
      ],
    },
    {
      platform: "eBay",
      rating: "4.3",
      reviewCount: 56,
      positivePoints: [
        "Works as advertised",
        "Good customer service",
      ],
      negativePoints: [
        "Slightly more expensive",
        "Limited color options",
      ],
    },
  ];

  await Promise.all(
    mockReviews.map((review) =>
      db
        .insert(productReviews)
        .values({
          productId,
          ...review,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: [productReviews.productId, productReviews.platform],
          set: {
            rating: review.rating,
            reviewCount: review.reviewCount,
            positivePoints: review.positivePoints,
            negativePoints: review.negativePoints,
            lastUpdated: new Date(),
          },
        })
    )
  );
}