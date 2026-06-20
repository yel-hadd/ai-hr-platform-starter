import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { auth } from "@/lib/auth";
import { getChatModel } from "@/lib/ai/providers";
import { buildHrTools } from "@/lib/ai/tools";
import { ROLE_LABELS, ROLE_PERMISSIONS, PERMISSION_LABELS } from "@/lib/rbac";

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

  const allowed = ROLE_PERMISSIONS[caller.role]
    .map((p) => `- ${PERMISSION_LABELS[p]}`)
    .join("\n");

  const system = `You are HARI, the assistant inside an AI-powered HR platform.
Today is ${new Date().toISOString().slice(0, 10)}.

The signed-in user is ${caller.name}, role: ${ROLE_LABELS[caller.role]}.
Their permissions:
${allowed}

Guidelines:
- For any policy / handbook question, ALWAYS call searchHandbook and answer ONLY from the returned sections, citing them by section name.
- Use tools to fetch live data instead of guessing. Chain tools when needed (e.g. check leave balance before requesting time off).
- Before submitting or approving anything (requestTimeOff, approveLeave), confirm the details with the user.
- Some tools may return { denied: true }. When that happens, briefly and politely explain that their role doesn't permit it — do not retry.
- Be concise. The UI renders rich cards for tool results, so don't repeat raw data in prose; just add a short summary.`;

  const result = streamText({
    model: getChatModel(modelId),
    system,
    messages: await convertToModelMessages(messages),
    tools: buildHrTools(caller),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
