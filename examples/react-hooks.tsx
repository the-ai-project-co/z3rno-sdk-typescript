/**
 * Example: Using the Z3rno SDK with React hooks.
 *
 * This file demonstrates how to wrap the SDK in standard React hooks
 * (useState + useEffect). It is NOT a published package — just a reference
 * for React / Next.js developers who want to integrate Z3rno into their apps.
 *
 * A dedicated `@z3rno/react` package with optimised hooks, suspense support,
 * and caching is planned for a future release.
 */

import { useEffect, useState } from "react";
import { Z3rnoClient, type MemoryResponse, type RecallResponse } from "@z3rno/sdk";

// --- Shared client singleton (create once, reuse across hooks) -----------

const client = new Z3rnoClient({
  baseUrl: process.env.NEXT_PUBLIC_Z3RNO_URL ?? "http://localhost:8000",
  apiKey: process.env.NEXT_PUBLIC_Z3RNO_KEY ?? "",
});

// --- useMemory -----------------------------------------------------------

/**
 * Fetches a single memory by ID.
 *
 * @example
 * ```tsx
 * function MemoryCard({ id }: { id: string }) {
 *   const { memory, loading, error } = useMemory(id);
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return <p>{memory?.content}</p>;
 * }
 * ```
 */
export function useMemory(memoryId: string) {
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    client
      .getMemory(memoryId)
      .then((data) => {
        if (!cancelled) {
          setMemory(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memoryId]);

  return { memory, loading, error };
}

// --- useRecall -----------------------------------------------------------

interface UseRecallParams {
  agentId: string;
  query: string;
  topK?: number;
  similarityThreshold?: number;
}

/**
 * Performs a semantic recall and returns results reactively.
 *
 * Re-fetches whenever `params.query` or `params.agentId` changes.
 *
 * @example
 * ```tsx
 * function SearchResults({ agentId, query }: { agentId: string; query: string }) {
 *   const { results, loading, error } = useRecall({ agentId, query, topK: 5 });
 *   if (loading) return <p>Searching...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return (
 *     <ul>
 *       {results?.results.map((r) => (
 *         <li key={r.memory_id}>{r.content} (score: {r.relevance_score})</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useRecall(params: UseRecallParams) {
  const [results, setResults] = useState<RecallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    client
      .recall({
        agentId: params.agentId,
        query: params.query,
        topK: params.topK,
        similarityThreshold: params.similarityThreshold,
      })
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.agentId, params.query, params.topK, params.similarityThreshold]);

  return { results, loading, error };
}
