import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

/**
 * Forces Claude to respond via a single tool call whose input schema matches the
 * expected shape, so results are guaranteed-parseable JSON rather than free-text that
 * might not parse — removes an entire class of "AI produced malformed output" failure.
 */
export async function callStructured<T>(params: {
  client: Anthropic;
  model: string;
  system: string;
  userMessage: string;
  toolName: string;
  toolDescription: string;
  jsonSchema: Record<string, unknown>;
  zodSchema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const response = await params.client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: [{ role: "user", content: params.userMessage }],
    tools: [
      {
        name: params.toolName,
        description: params.toolDescription,
        input_schema: { type: "object", ...params.jsonSchema } as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: params.toolName },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`Claude did not return a tool_use block for ${params.toolName}`);
  }

  return params.zodSchema.parse(toolUse.input);
}
