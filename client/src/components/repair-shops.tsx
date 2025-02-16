import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mockRepairShops, type RepairShop } from "@shared/schema";
import { Star } from "lucide-react";

export function RepairShops() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Repair Shops</CardTitle>
        <CardDescription>Trusted local repair services</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {mockRepairShops.map((shop: RepairShop) => (
            <Card key={shop.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{shop.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {shop.distance} away
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{shop.rating}</span>
                  </div>
                </div>
                <div className="mt-2">
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
