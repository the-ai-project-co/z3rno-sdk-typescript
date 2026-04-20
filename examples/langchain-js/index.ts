/**
 * Z3rno + LangChain.js integration example.
 *
 * Demonstrates using Z3rno as a persistent chat message history backend
 * for LangChain.js conversations. Memories persist across sessions and
 * are recalled by semantic similarity rather than simple chronological order.
 *
 * Prerequisites:
 *   npm install langchain @langchain/openai @z3rno/sdk
 *
 * Usage:
 *   export Z3RNO_API_KEY=z3rno_sk_...
 *   export OPENAI_API_KEY=sk-...
 *   npx tsx examples/langchain-js/index.ts
 */

import { Z3rnoClient, type MemoryResponse } from "../../src/index.js";

// NOTE: These imports require LangChain.js to be installed.
// Uncomment when running with a real setup:
// import { ChatOpenAI } from "@langchain/openai";
// import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

const AGENT_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * A simple Z3rno-backed message history that stores and recalls
 * conversation messages as memories. This is a reference implementation —
 * adapt it for your LangChain.js chain or agent setup.
 */
class Z3rnoMessageHistory {
  private client: Z3rnoClient;
  private agentId: string;
  private sessionId: string | null = null;

  constructor(agentId: string) {
    this.client = new Z3rnoClient();
    this.agentId = agentId;
  }

  /** Start a new conversation session. */
  async startSession(): Promise<string> {
    const session = await this.client.startSession({
      agentId: this.agentId,
      sessionType: "conversation",
    });
    this.sessionId = session.session_id;
    console.log(`Session started: ${this.sessionId}`);
    return this.sessionId;
  }

  /** Store a message as a memory. */
  async addMessage(role: "human" | "ai", content: string): Promise<MemoryResponse> {
    return this.client.store({
      agentId: this.agentId,
      content: `[${role}] ${content}`,
      memoryType: "episodic",
      metadata: {
        role,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /** Recall relevant past messages for a given query. */
  async getRelevantHistory(query: string, topK: number = 10) {
    const results = await this.client.recall({
      agentId: this.agentId,
      query,
      topK,
      similarityThreshold: 0.5,
    });
    return results.results;
  }

  /** End the current session. */
  async endSession() {
    if (this.sessionId) {
      const summary = await this.client.endSession(this.sessionId);
      console.log(
        `Session ended: ${summary.duration_seconds}s, ${summary.memory_count} memories`,
      );
      this.sessionId = null;
    }
  }
}

async function main() {
  console.log("=== Z3rno + LangChain.js Example ===\n");

  const history = new Z3rnoMessageHistory(AGENT_ID);

  // Start a session
  await history.startSession();

  // Simulate a conversation
  const userMessages = [
    "I'm building a RAG pipeline with LangChain and need help with chunking strategies.",
    "My documents are mostly technical PDFs, around 50-100 pages each.",
    "I'm using OpenAI embeddings with text-embedding-3-small.",
  ];

  for (const msg of userMessages) {
    console.log(`\nUser: ${msg}`);

    // Store the human message
    await history.addMessage("human", msg);

    // Recall relevant context
    const context = await history.getRelevantHistory(msg, 5);
    if (context.length > 0) {
      console.log("\nRelevant memories:");
      for (const item of context) {
        console.log(`  [${item.similarity_score.toFixed(2)}] ${item.content}`);
      }
    }

    // In a real app, you'd pass the context to LangChain:
    // const llm = new ChatOpenAI({ model: "gpt-4o" });
    // const response = await llm.invoke([
    //   new SystemMessage(`Context from memory:\n${context.map(c => c.content).join("\n")}`),
    //   new HumanMessage(msg),
    // ]);
    // console.log(`AI: ${response.content}`);

    const aiResponse = "(simulated AI response)";
    console.log(`AI: ${aiResponse}`);
    await history.addMessage("ai", aiResponse);
  }

  // End the session
  await history.endSession();

  console.log("\nDone!");
}

main().catch(console.error);
