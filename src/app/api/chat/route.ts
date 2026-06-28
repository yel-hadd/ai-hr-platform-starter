import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { auth } from "@/lib/auth";
import { getChatModel } from "@/lib/ai/providers";
import { buildHrTools } from "@/lib/ai/tools";
import { ROLE_LABELS } from "@/lib/rbac";
import { localeConfig } from "@/i18n/routing";
import { getOrgSettings } from "@/lib/settings";
import { getLocale } from "next-intl/server";

export const maxDuration = 60;

// Map an upstream/model failure to a stable code the client localizes
// (chat.errors.<code>). Kept deliberately coarse — the goal is to replace the
// misleading "check your API key" catch-all with the actual cause.
function chatErrorCode(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/API_KEY|api key|unauthor|\b401\b/i.test(msg)) return "auth_missing";
  if (/\b429\b|rate.?limit|quota/i.test(msg)) return "rate_limited";
  if (/\b404\b|no endpoints|not a valid model|model_not_found/i.test(msg))
    return "model_unavailable";
  return "generic";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, modelKey } = (await req.json()) as {
    messages: UIMessage[];
    modelKey?: string;
  };

  const caller = {
    role: session.user.role,
    employeeId: session.user.employeeId,
    name: session.user.name ?? "the user",
  };

  // The UI locale (NEXT_LOCALE cookie). The assistant answers in this language,
  // and "today" is formatted for it, so dates in the prompt read naturally.
  const locale = await getLocale();
  const { language, dateLocale } = localeConfig[locale];

  // Org-wide currency + timezone (super-admin configurable). The assistant must
  // state money in this currency and reason about "now" in this timezone — which
  // is also threaded into the tools so getCurrentDateTime can't contradict it.
  const { currency, timezone } = await getOrgSettings();

  const tools = buildHrTools(caller, { timezone });

  // Capabilities == the tools actually injected for this caller, so the prompt
  // and the injected toolset can never disagree.
  const capabilities = Object.entries(tools)
    .map(([name, t]) => `- ${name}: ${t.description}`)
    .join("\n");

  const now = new Date();
  const currentDateTime = now.toLocaleString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
  // ISO date in the ORG timezone (not UTC) so it never names a different day than
  // the human-readable date above. en-CA formats as YYYY-MM-DD.
  const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);

  const system = `You are HARI, the assistant inside an AI-powered HR platform.
Always respond to the user in ${language}, regardless of the language these instructions are written in. Translate any tool result you relay (including error messages) into ${language}.
The current date and time is ${currentDateTime} (today's date in YYYY-MM-DD is ${isoDate}), in the organization's timezone ${timezone}. Use this as the source of truth for "today" — work out any relative date ("next Monday", "tomorrow", "in two weeks") from it and confirm the exact calendar date with the user.
All monetary amounts in this organization are already in ${currency}; never convert to or assume another currency. When you mention an amount in prose, state it in ${currency} — a plain number with the currency is fine, and the result cards format amounts for you.

The signed-in user is ${caller.name}, role: ${ROLE_LABELS[caller.role]}.

You have EXACTLY these tools — they are the full extent of what you can do:
${capabilities}

Guidelines:
- For any policy / handbook question, ALWAYS call searchHandbook and answer ONLY from the returned sections, in your own words.
- Citations: ground each claim with the source's "ref" number in plain ASCII square brackets only — write [1], never 【1】 or other bracket styles — e.g. "Full-time employees accrue 20 vacation days [1]." Cite several as [1][2]. The interface turns each [n] into a clickable link to the exact section. Output ONLY the bracketed number: NEVER paste a tool result, JSON, or any field from it (id, url, content, similarity, slug, anchor, section/article title) into your reply, and don't write a "Source: …" line. Correct: "Parental leave is 16 weeks [1]." Wrong: writing out the section text, the URL, or the {…} object. Use each ref exactly as returned; if you search more than once the numbers keep counting up, so never reuse or invent one.
- Use your tools to fetch live data instead of guessing. Chain tools when needed (e.g. check leave balance before requesting time off).
- Pick the tool that matches the question: vacation / PTO / time-off / leave days remaining → getLeaveBalances; pay / salary / payslip (money) → getPayslip; people / who reports to whom / contact info → getEmployeeDirectory; company policy → searchHandbook. getPayslip is money only — it never contains leave balances.
- For READS (payslip, leave balance, directory, handbook): whenever you tell the user you'll show or retrieve something, CALL the tool in the same turn — never say "here's your payslip/leave/etc." without the tool result, and don't describe data you didn't fetch.
- For WRITES (requestTimeOff, approveLeave): first restate the exact details (dates, type, who) and wait for the user's confirmation, then call the tool on the next turn. Don't submit or approve without that confirmation.
- If a request mixes things you can and can't do, just do the parts you can (call those tools) and briefly note the rest isn't available to their role. Don't enumerate or speculate about tools you don't have — out-of-scope is simply out of scope, never a system error.
- For efficiency, pass only ids (employeeId, requestId) that a previous tool returned; if you don't have one, call the tool that lists them first. (The server also authorizes every id, so out-of-scope ids return nothing.)
- Don't print raw database ids (request ids, employee ids) in your replies — the result cards already show what the user needs.
- If a tool returns an { error } field, relay it briefly and suggest a sensible next step.
- Be concise. The UI renders rich cards for tool results, so don't repeat raw data in prose; just add a short summary.`;

  let model;
  try {
    model = getChatModel(modelKey);
  } catch (e) {
    // Missing/invalid provider key resolved synchronously — fail loudly server-side.
    console.error("chat model resolution failed:", e);
    return new Response(chatErrorCode(e), { status: 503 });
  }

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
    tools,
    // Allow a few tool round-trips (list → act → confirm). Higher than the
    // typical 2-3 so multi-step flows don't get cut off mid-task.
    stopWhen: stepCountIs(8),
    onError: ({ error }) => console.error("chat stream error:", error),
  });

  // Surface the real cause to the client as a stable code (chat.errors.<code>),
  // instead of the previous misleading "check your API key" default.
  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: (error) => chatErrorCode(error),
  });
}
