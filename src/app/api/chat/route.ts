import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { auth } from "@/lib/auth";
import { getChatModel } from "@/lib/ai/providers";
import { buildHrTools, TOOL_CATALOGUE } from "@/lib/ai/tools";
import { can, ROLE_LABELS } from "@/lib/rbac";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, modelId } = (await req.json()) as {
    messages: UIMessage[];
    modelId?: string;
  };

  const caller = {
    role: session.user.role,
    employeeId: session.user.employeeId,
    name: session.user.name ?? "the user",
  };

  // Capabilities == the tools this role is actually given (same catalogue that
  // gates exposure), so the prompt and the injected toolset can never disagree.
  const capabilities = TOOL_CATALOGUE.filter(
    (t) => t.permission === null || can(caller.role, t.permission),
  )
    .map((t) => `- ${t.name}: ${t.summary}`)
    .join("\n");

  const tools = buildHrTools(caller);

  const today = new Date();
  const todayStr = `${today.toLocaleDateString("en-US", { weekday: "long" })}, ${today.toISOString().slice(0, 10)}`;

  const system = `You are HARI, the assistant inside an AI-powered HR platform.
Today is ${todayStr}. For any relative date ("next Monday", "tomorrow"), call getCurrentDateTime first to anchor it, then confirm the exact calendar date.

The signed-in user is ${caller.name}, role: ${ROLE_LABELS[caller.role]}.

You have EXACTLY these tools — they are the full extent of what you can do:
${capabilities}

Guidelines:
- For any policy / handbook question, ALWAYS call searchHandbook and answer ONLY from the returned sections, citing them by section name.
- Use your tools to fetch live data instead of guessing. Chain tools when needed (e.g. check leave balance before requesting time off).
- If the user asks for something none of your tools can do (e.g. data about other employees this role can't see), say plainly and briefly that it isn't available to their role, and offer what you CAN do. Never pretend, never imply a system error — there is none, it's simply out of scope.
- For efficiency, pass only ids (employeeId, requestId) that a previous tool returned; if you don't have one, call the tool that lists them first. (The server also authorizes every id, so out-of-scope ids return nothing.)
- Before submitting or approving anything (requestTimeOff, approveLeave), confirm the details with the user.
- Don't print raw database ids (request ids, employee ids) in your replies — the result cards already show what the user needs.
- If a tool returns an { error } field, relay it briefly and suggest a sensible next step.
- Be concise. The UI renders rich cards for tool results, so don't repeat raw data in prose; just add a short summary.`;

  const result = streamText({
    model: getChatModel(modelId),
    system,
    messages: await convertToModelMessages(messages),
    tools,
    // Allow a few tool round-trips (list → act → confirm). Higher than the
    // typical 2-3 so multi-step flows don't get cut off mid-task.
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
