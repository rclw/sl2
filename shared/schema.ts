
import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const proofs = pgTable("proofs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(), // Stores the ReactFlow nodes/edges
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProofSchema = createInsertSchema(proofs).omit({ 
  id: true, 
  createdAt: true 
});

export type Proof = typeof proofs.$inferSelect;
export type InsertProof = z.infer<typeof insertProofSchema>;
export type CreateProofRequest = InsertProof;
export type UpdateProofRequest = Partial<InsertProof>;
