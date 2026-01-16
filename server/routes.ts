
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // List proofs
  app.get(api.proofs.list.path, async (req, res) => {
    const proofs = await storage.getProofs();
    res.json(proofs);
  });

  // Get proof
  app.get(api.proofs.get.path, async (req, res) => {
    const proof = await storage.getProof(Number(req.params.id));
    if (!proof) {
      return res.status(404).json({ message: "Proof not found" });
    }
    res.json(proof);
  });

  // Create proof
  app.post(api.proofs.create.path, async (req, res) => {
    try {
      const input = api.proofs.create.input.parse(req.body);
      const proof = await storage.createProof(input);
      res.status(201).json(proof);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // Update proof
  app.put(api.proofs.update.path, async (req, res) => {
    try {
      const input = api.proofs.update.input.parse(req.body);
      const proof = await storage.updateProof(Number(req.params.id), input);
      if (!proof) {
        return res.status(404).json({ message: "Proof not found" });
      }
      res.json(proof);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // Delete proof
  app.delete(api.proofs.delete.path, async (req, res) => {
    await storage.deleteProof(Number(req.params.id));
    res.status(204).send();
  });

  // Seed data
  const existing = await storage.getProofs();
  if (existing.length === 0) {
    await storage.createProof({
      title: "Modus Ponens Example",
      description: "A simple demonstration of Modus Ponens",
      content: {
        nodes: [
          {
            id: "1",
            type: "proofNode",
            position: { x: 250, y: 50 },
            data: { label: "A \\to B" }
          },
          {
            id: "2",
            type: "inference",
            position: { x: 450, y: 50 },
            data: { label: "A" }
          },
          {
            id: "3",
            type: "inference",
            position: { x: 350, y: 150 },
            data: { label: "B", rule: "\\to E" }
          }
        ],
        edges: [
          { id: "e1-3", source: "1", target: "3" },
          { id: "e2-3", source: "2", target: "3" }
        ]
      }
    });
    
    await storage.createProof({
      title: "Conjunction Introduction",
      description: "Proving A and B from A, B",
      content: {
        nodes: [
          {
            id: "1",
            type: "inference",
            position: { x: 100, y: 50 },
            data: { label: "P" }
          },
          {
            id: "2",
            type: "inference",
            position: { x: 300, y: 50 },
            data: { label: "Q" }
          },
          {
            id: "3",
            type: "inference",
            position: { x: 200, y: 150 },
            data: { label: "P \\land Q", rule: "\\land I" }
          }
        ],
        edges: [
          { id: "e1-3", source: "1", target: "3" },
          { id: "e2-3", source: "2", target: "3" }
        ]
      }
    });
  }

  return httpServer;
}
