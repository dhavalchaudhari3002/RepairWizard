import { repairRequests, type RepairRequest, type InsertRepairRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createRepairRequest(request: InsertRepairRequest): Promise<RepairRequest>;
  getRepairRequest(id: number): Promise<RepairRequest | undefined>;
  getAllRepairRequests(): Promise<RepairRequest[]>;
}

export class DatabaseStorage implements IStorage {
  async createRepairRequest(request: InsertRepairRequest): Promise<RepairRequest> {
    const [repairRequest] = await db
      .insert(repairRequests)
      .values({
        ...request,
        status: "pending"
      })
      .returning();
    return repairRequest;
  }

  async getRepairRequest(id: number): Promise<RepairRequest | undefined> {
    const [repairRequest] = await db
      .select()
      .from(repairRequests)
      .where(eq(repairRequests.id, id));
    return repairRequest || undefined;
  }

  async getAllRepairRequests(): Promise<RepairRequest[]> {
    return await db.select().from(repairRequests);
  }
}

export const storage = new DatabaseStorage();