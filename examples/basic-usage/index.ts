/**
 * Basic Z3rno SDK usage example.
 *
 * Demonstrates the core store / recall / forget workflow.
 *
 * Usage:
 *   export Z3RNO_BASE_URL=http://localhost:8000
 *   export Z3RNO_API_KEY=z3rno_sk_...
 *   npx tsx examples/basic-usage/index.ts
 */

import { Z3rnoClient, Z3rnoError } from "../../src/index.js";

async function main() {
  // 1. Create the client (reads Z3RNO_BASE_URL and Z3RNO_API_KEY from env)
  const client = new Z3rnoClient();

  const agentId = "550e8400-e29b-41d4-a716-446655440000";

  try {
    // 2. Store a memory
    console.log("--- Storing memory ---");
    const memory = await client.store({
      agentId,
      content: "User prefers dark mode and compact layout",
      memoryType: "semantic",
      metadata: { source: "settings-page" },
    });
    console.log(`Stored memory: ${memory.id}`);
    console.log(`  content: ${memory.content}`);
    console.log(`  importance: ${memory.importance_score}`);

    // 3. Store another memory
    const memory2 = await client.store({
      agentId,
      content: "User's timezone is America/New_York",
      memoryType: "semantic",
    });
    console.log(`Stored memory: ${memory2.id}`);

    // 4. Recall memories by semantic search
    console.log("\n--- Recalling memories ---");
    const results = await client.recall({
      agentId,
      query: "What are the user's preferences?",
      topK: 5,
      similarityThreshold: 0.5,
    });
    console.log(`Found ${results.total} results:`);
    for (const item of results.results) {
      console.log(`  [${item.similarity_score.toFixed(2)}] ${item.content}`);
    }

    // 5. Get a single memory by ID
    console.log("\n--- Getting memory by ID ---");
    const fetched = await client.getMemory(memory.id);
    console.log(`Retrieved: ${fetched.content}`);

    // 6. Update a memory
    console.log("\n--- Updating memory ---");
    const updated = await client.updateMemory(memory.id, {
      content: "User prefers dark mode, compact layout, and large fonts",
      importance: 0.9,
    });
    console.log(`Updated: ${updated.content}`);

    // 7. View memory history
    console.log("\n--- Memory history ---");
    const history = await client.getMemoryHistory(memory.id);
    console.log(`${history.total} versions:`);
    for (const version of history.versions) {
      console.log(`  ${version.valid_from}: ${version.content}`);
    }

    // 8. Batch store
    console.log("\n--- Batch store ---");
    const batch = await client.storeBatch([
      { agentId, content: "User speaks English and Spanish" },
      { agentId, content: "User is in the finance industry" },
    ]);
    console.log(`Batch stored ${batch.stored_count} memories`);

    // 9. Audit log
    console.log("\n--- Audit log ---");
    const auditPage = await client.audit({ agentId, page: 1, pageSize: 5 });
    console.log(`${auditPage.total} audit entries (showing page 1):`);
    for (const entry of auditPage.entries) {
      console.log(`  ${entry.created_at}: ${entry.operation}`);
    }

    // 10. Forget a memory
    console.log("\n--- Forgetting memory ---");
    const forgot = await client.forget({
      agentId,
      memoryId: memory.id,
      reason: "Outdated preference",
    });
    console.log(`Deleted ${forgot.deleted_count} memory/memories`);

    console.log("\nDone!");
  } catch (error) {
    if (error instanceof Z3rnoError) {
      console.error(`Z3rno error (${error.statusCode}): ${error.message}`);
    } else {
      throw error;
    }
  }
}

main();
