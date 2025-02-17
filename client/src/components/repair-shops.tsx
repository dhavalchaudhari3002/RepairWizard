import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type RepairShop } from "@shared/schema";
import { Star, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function RepairShops() {
  const { data: shops, isLoading, error } = useQuery<RepairShop[]>({
    queryKey: ["/api/repair-shops"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Repair Shops</CardTitle>
          <CardDescription>Loading repair services...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Repair Shops</CardTitle>
          <CardDescription className="text-destructive">
            Failed to load repair shops
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!shops?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Repair Shops</CardTitle>
          <CardDescription>No repair shops found in your area</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Repair Shops</CardTitle>
        <CardDescription>Trusted local repair services</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {shops.map((shop) => (
            <Card key={shop.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{shop.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {shop.address}
                    </p>
                  </div>
                  {shop.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{shop.rating}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    {shop.phoneNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Specialties: {shop.specialties.join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}