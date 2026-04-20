/**
 * LangChain.js memory provider sketch.
 *
 * Demonstrates wrapping the Z3rno SDK as a LangChain.js BaseMemory
 * implementation so it can be used with LangChain chains and agents.
 *
 * Prerequisites:
 *   npm install langchain @langchain/core @z3rno/sdk
 *
 * Run with: npx tsx examples/langchain-js.ts
 */

import { BaseMemory, InputValues, OutputValues, MemoryVariables } from "langchain/memory";
import { Z3rnoClient } from "@z3rno/sdk";

/**
 * LangChain.js memory backed by Z3rno.
 *
 * Stores conversation history as Z3rno memories and retrieves
 * relevant context on each chain invocation.
 */
class Z3rnoMemory extends BaseMemory {
  private client: Z3rnoClient;
  private agentId: string;
  private memoryKey: string;
  private topK: number;

  constructor(options: {
    client: Z3rnoClient;
    agentId: string;
    memoryKey?: string;
    topK?: number;
  }) {
    super();
    this.client = options.client;
    this.agentId = options.agentId;
    this.memoryKey = options.memoryKey ?? "history";
    this.topK = options.topK ?? 5;
  }

  get memoryKeys(): string[] {
    return [this.memoryKey];
  }

  /**
   * Load relevant memories based on the current input.
   */
  async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
    const query =
      typeof values.input === "string"
        ? values.input
        : JSON.stringify(values);

    const result = await this.client.recall({
      agentId: this.agentId,
      query,
      topK: this.topK,
      similarityThreshold: 0.5,
    });

    const memories = result.results
      .map((r) => r.content)
      .join("\n");

    return { [this.memoryKey]: memories };
  }

  /**
   * Store the input/output pair as a new Z3rno memory.
   */
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues,
  ): Promise<void> {
    const input = inputValues.input ?? JSON.stringify(inputValues);
    const output = outputValues.output ?? JSON.stringify(outputValues);

    await this.client.store({
      agentId: this.agentId,
      content: `Human: ${input}\nAssistant: ${output}`,
      memoryType: "episodic",
      metadata: {
        source: "langchain",
        input_keys: Object.keys(inputValues),
        output_keys: Object.keys(outputValues),
      },
    });
  }

  async clear(): Promise<void> {
    // Optionally forget all memories for this agent
    const memories = await this.client.recall({
      agentId: this.agentId,
      topK: 100,
    });

    if (memories.results.length > 0) {
      await this.client.forget({
        agentId: this.agentId,
        memoryIds: memories.results.map((r) => r.memory_id),
        reason: "LangChain memory cleared",
      });
    }
  }
}

// --- Usage ---

async function main() {
  const client = new Z3rnoClient({
    baseUrl: process.env.Z3RNO_BASE_URL ?? "http://localhost:8000",
    apiKey: process.env.Z3RNO_API_KEY,
  });

  const memory = new Z3rnoMemory({
    client,
    agentId: "550e8400-e29b-41d4-a716-446655440000",
    topK: 5,
  });

  // Simulate saving context from a conversation
  await memory.saveContext(
    { input: "What is Z3rno?" },
    { output: "Z3rno is an AI agent memory database." },
  );

  // Load relevant memories for a follow-up question
  const vars = await memory.loadMemoryVariables({
    input: "Tell me more about agent memory",
  });

  console.log("Loaded memory context:");
  console.log(vars.history);
}

main().catch(console.error);
