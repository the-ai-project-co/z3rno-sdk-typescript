/**
 * Basic usage example for the Z3rno TypeScript SDK.
 *
 * Demonstrates the three core operations: store, recall, and forget.
 *
 * Run with: npx tsx examples/basic-usage.ts
 */

import { Z3rnoClient } from "@z3rno/sdk";

async function main() {
  // Create a client — reads Z3RNO_BASE_URL and Z3RNO_API_KEY from env
  const client = new Z3rnoClient({
    baseUrl: process.env.Z3RNO_BASE_URL ?? "http://localhost:8000",
    apiKey: process.env.Z3RNO_API_KEY ?? "z3rno_sk_dev_...",
  });

  const agentId = "550e8400-e29b-41d4-a716-446655440000";

  // --- Store ---
  console.log("Storing memories...");

  const mem1 = await client.store({
    agentId,
    content: "User prefers dark mode and large fonts",
    memoryType: "semantic",
    metadata: { source: "settings" },
  });
  console.log(`  Stored: ${mem1.id} (importance: ${mem1.importance_score})`);

  const mem2 = await client.store({
    agentId,
    content: "User asked about pricing plans on 2026-04-19",
    memoryType: "episodic",
  });
  console.log(`  Stored: ${mem2.id}`);

  // --- Recall ---
  console.log("\nRecalling memories about user preferences...");

  const results = await client.recall({
    agentId,
    query: "What does the user prefer?",
    topK: 5,
    similarityThreshold: 0.5,
  });

  console.log(`  Found ${results.total} results:`);
  for (const item of results.results) {
    console.log(`    [${item.similarity_score.toFixed(2)}] ${item.content}`);
  }

  // --- Forget ---
  console.log("\nForgetting episodic memory...");

  const forgotten = await client.forget({
    agentId,
    memoryId: mem2.id,
    reason: "No longer relevant",
  });
  console.log(`  Deleted ${forgotten.deleted_count} memory(ies)`);

  // --- Audit ---
  console.log("\nChecking audit log...");

  const audit = await client.audit({ agentId, page: 1, pageSize: 10 });
  console.log(`  ${audit.total} audit entries:`);
  for (const entry of audit.entries) {
    console.log(`    ${entry.created_at}: ${entry.operation} — ${entry.memory_id ?? "n/a"}`);
  }
}

main().catch(console.error);
