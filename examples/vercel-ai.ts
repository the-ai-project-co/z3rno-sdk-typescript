/**
 * Vercel AI SDK integration sketch.
 *
 * Shows how to use Z3rno as a memory layer alongside the Vercel AI SDK
 * (`ai` package) to give an LLM long-term memory across conversations.
 *
 * Prerequisites:
 *   npm install ai @ai-sdk/openai @z3rno/sdk
 *
 * Run with: npx tsx examples/vercel-ai.ts
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Z3rnoClient } from "@z3rno/sdk";

const z3rno = new Z3rnoClient({
  baseUrl: process.env.Z3RNO_BASE_URL ?? "http://localhost:8000",
  apiKey: process.env.Z3RNO_API_KEY,
});

const AGENT_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * Chat with memory-augmented context.
 *
 * 1. Recall relevant memories for the user's message.
 * 2. Inject them as system context.
 * 3. Generate a response with the Vercel AI SDK.
 * 4. Store the interaction as a new memory.
 */
async function chatWithMemory(userMessage: string): Promise<string> {
  // Step 1: Recall relevant memories
  const memories = await z3rno.recall({
    agentId: AGENT_ID,
    query: userMessage,
    topK: 5,
    similarityThreshold: 0.6,
  });

  const memoryContext = memories.results
    .map((m) => `- ${m.content} (relevance: ${m.relevance_score.toFixed(2)})`)
    .join("\n");

  // Step 2: Build system prompt with memory context
  const systemPrompt = `You are a helpful assistant with long-term memory.

Here are relevant memories about this user:
${memoryContext || "(no relevant memories found)"}

Use these memories to personalize your response.`;

  // Step 3: Generate response using Vercel AI SDK
  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    prompt: userMessage,
  });

  // Step 4: Store the interaction as a new memory
  await z3rno.store({
    agentId: AGENT_ID,
    content: `User asked: "${userMessage}" — Assistant responded about: ${text.slice(0, 200)}`,
    memoryType: "episodic",
    metadata: { source: "vercel-ai-chat" },
  });

  return text;
}

// --- Main ---

async function main() {
  const response = await chatWithMemory("What display settings do I prefer?");
  console.log("Assistant:", response);
}

main().catch(console.error);
