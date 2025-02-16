import { repairRequests, type RepairRequest, type InsertRepairRequest } from "@shared/schema";

export interface IStorage {
  createRepairRequest(request: InsertRepairRequest): Promise<RepairRequest>;
  getRepairRequest(id: number): Promise<RepairRequest | undefined>;
  getAllRepairRequests(): Promise<RepairRequest[]>;
}

export class MemStorage implements IStorage {
  private repairRequests: Map<number, RepairRequest>;
  private currentId: number;

  constructor() {
    this.repairRequests = new Map();
    this.currentId = 1;
  }

  async createRepairRequest(request: InsertRepairRequest): Promise<RepairRequest> {
    const id = this.currentId++;
    const repairRequest: RepairRequest = {
      id,
      status: "pending",
      ...request,
    };
    this.repairRequests.set(id, repairRequest);
    return repairRequest;
  }

  async getRepairRequest(id: number): Promise<RepairRequest | undefined> {
    return this.repairRequests.get(id);
  }

  async getAllRepairRequests(): Promise<RepairRequest[]> {
    return Array.from(this.repairRequests.values());
  }
}

export const storage = new MemStorage();
