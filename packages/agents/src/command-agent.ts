import { getAiGateway } from "@instagram-agent/ai-gateway";
import type { CommandResult } from "@instagram-agent/types";
import { loadAccountContext } from "./account-context";

/**
 * MVP scope: interprets the owner's free-text command and returns a response.
 * Dispatching specific intents (e.g. "build this week's content calendar") into
 * concrete ProposedActions is a deepening-pass task — see build-order step 16 in the plan.
 */
export async function runCommand(instagramAccountId: string, command: string): Promise<CommandResult> {
  const account = await loadAccountContext(instagramAccountId);
  return getAiGateway().handleCommand({ account, command });
}
