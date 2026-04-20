/**
 * Z3rno + Vercel AI SDK integration example.
 *
 * Demonstrates a memory-augmented chat assistant that stores conversation
 * facts into Z3rno and recalls relevant context before each response.
 *
 * Prerequisites:
 *   npm install ai @ai-sdk/openai @z3rno/sdk
 *
 * Usage:
 *   export Z3RNO_API_KEY=z3rno_sk_...
 *   export OPENAI_API_KEY=sk-...
 *   npx tsx examples/vercel-ai/index.ts
 */

import { Z3rnoClient } from "../../src/index.js";

// NOTE: These imports require the Vercel AI SDK to be installed.
// Uncomment when running with a real setup:
// import { generateText } from "ai";
// import { openai } from "@ai-sdk/openai";

const AGENT_ID = "550e8400-e29b-41d4-a716-446655440000";

async function memoryAugmentedChat(userMessage: string) {
  const z3rno = new Z3rnoClient();

  // 1. Recall relevant memories before generating a response
  const memories = await z3rno.recall({
    agentId: AGENT_ID,
    query: userMessage,
    topK: 5,
    similarityThreshold: 0.6,
  });

  // 2. Build context from recalled memories
  const memoryContext = memories.results
    .map((m) => `- ${m.content} (relevance: ${m.relevance_score.toFixed(2)})`)
    .join("\n");

  const systemPrompt = `You are a helpful assistant with memory.

Here are relevant things you remember about this user:
${memoryContext || "(No relevant memories found)"}

Use these memories to personalize your response. If the user shares new
information about themselves, note it for future reference.`;

  console.log("System prompt with memories:");
  console.log(systemPrompt);
  console.log("---");

  // 3. Generate response with Vercel AI SDK
  // Uncomment when running with real dependencies:
  // const { text } = await generateText({
  //   model: openai("gpt-4o"),
  //   system: systemPrompt,
  //   prompt: userMessage,
  // });
  // console.log("Assistant:", text);

  // 4. Store new facts from the conversation
  // In a real app, you'd extract facts from the user's message
  // and the assistant's response using an LLM or heuristics.
  await z3rno.store({
    agentId: AGENT_ID,
    content: `User said: "${userMessage}"`,
    memoryType: "episodic",
    metadata: {
      source: "vercel-ai-chat",
      turn: Date.now(),
    },
  });

  console.log("Memory stored for future recall.");
}

async function main() {
  console.log("=== Z3rno + Vercel AI SDK Example ===\n");

  // Simulate a multi-turn conversation
  await memoryAugmentedChat("Hi! I'm a software engineer working on ML pipelines.");
  console.log("\n---\n");

  await memoryAugmentedChat("Can you help me optimize my data preprocessing?");
  console.log("\n---\n");

  // This recall should include context from previous turns
  await memoryAugmentedChat("What do you remember about me?");
}

main().catch(console.error);
