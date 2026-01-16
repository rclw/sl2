import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Default proof data for static mode
const defaultProof = {
  id: 1,
  title: "My Proof",
  description: "Edit your proof here",
  content: {
    nodes: [
      {
        id: "1",
        type: 'proofNode',
        position: { x: -135, y: -115 },
        data: {
          expression: "\\Gamma\\vdash\\Delta,A"
        }
      },
      {
        id: "2",
        type: 'proofNode',
        position: { x: 165, y: -115 },
        data: {
          expression: "A,\\Gamma'\\vdash\\Delta'"
        }
      },
      {
        id: "3",
        type: 'proofNode',
        position: { x: 0, y: 0 },
        data: {
          expression: "\\Gamma, \\Gamma' \\vdash \\Delta, \\Delta'",
          leftAnnotation: "\\text{Cut}"
        }
      }
    ],
    edges: [
      {
        id: "e1-3",
        source: "1",
        target: "3"
      },
      {
        id: "e2-3",
        source: "2",
        target: "3"
      }
    ]
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useProofs() {
  return useQuery({
    queryKey: ["proofs"],
    queryFn: async () => [defaultProof],
    staleTime: Infinity,
  });
}

export function useProof(id: number) {
  return useQuery({
    queryKey: ["proof", id],
    queryFn: async () => defaultProof,
    staleTime: Infinity,
    enabled: true,
  });
}

export function useCreateProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => defaultProof,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proofs"] }),
  });
}

export function useUpdateProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      // In static mode, just return the updated data
      return { ...defaultProof, ...updates };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
      queryClient.invalidateQueries({ queryKey: ["proof", data.id] });
    },
  });
}

export function useDeleteProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      // No-op in static mode
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proofs"] }),
  });
}
