
import { proofs, type InsertProof, type Proof } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getProofs(): Promise<Proof[]>;
  getProof(id: number): Promise<Proof | undefined>;
  createProof(proof: InsertProof): Promise<Proof>;
  updateProof(id: number, proof: Partial<InsertProof>): Promise<Proof>;
  deleteProof(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProofs(): Promise<Proof[]> {
    return await db.select().from(proofs).orderBy(desc(proofs.createdAt));
  }

  async getProof(id: number): Promise<Proof | undefined> {
    const [proof] = await db.select().from(proofs).where(eq(proofs.id, id));
    return proof;
  }

  async createProof(insertProof: InsertProof): Promise<Proof> {
    const [proof] = await db.insert(proofs).values(insertProof).returning();
    return proof;
  }

  async updateProof(id: number, update: Partial<InsertProof>): Promise<Proof> {
    const [proof] = await db
      .update(proofs)
      .set(update)
      .where(eq(proofs.id, id))
      .returning();
    return proof;
  }

  async deleteProof(id: number): Promise<void> {
    await db.delete(proofs).where(eq(proofs.id, id));
  }
}

export const storage = new DatabaseStorage();
