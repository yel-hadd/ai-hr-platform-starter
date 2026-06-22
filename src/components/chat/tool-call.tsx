"use client";

import { Loader2, Wrench, AlertTriangle } from "lucide-react";
import { Citations } from "./generative/citations";
import { DirectoryCards } from "./generative/directory";
import {
  LeaveBalances,
  LeaveRequestCard,
  ApprovalResultCard,
  PendingApprovals,
} from "./generative/leave";
import { Payslip } from "./generative/payslip";

const TOOL_LABELS: Record<string, string> = {
  searchHandbook: "Searching the handbook",
  getEmployeeDirectory: "Looking up the directory",
  getLeaveBalance: "Checking leave balance",
  requestTimeOff: "Submitting time-off request",
  listPendingApprovals: "Fetching pending approvals",
  approveLeave: "Processing approval",
  getPayslip: "Retrieving payslip",
};

type ToolPart = {
  type: string; // "tool-<name>"
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output?: any;
  errorText?: string;
};

export function ToolCall({ part }: { part: ToolPart }) {
  const name = part.type.replace(/^tool-/, "");
  const label = TOOL_LABELS[name] ?? name;
  const running = part.state === "input-streaming" || part.state === "input-available";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {running ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Wrench className="size-3.5" />
        )}
        <span>{label}</span>
        <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{name}</code>
      </div>

      {part.state === "output-error" && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          <AlertTriangle className="size-3.5" /> {part.errorText ?? "Tool error"}
        </div>
      )}

      {part.state === "output-available" && <ToolOutput name={name} output={part.output} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolOutput({ name, output }: { name: string; output: any }) {
  if (!output) return null;
  if (output.error)
    return (
      <p className="rounded-lg border border-dashed p-2 text-xs text-muted-foreground">
        {output.error}
      </p>
    );

  switch (name) {
    case "searchHandbook":
      return <Citations query={output.query} results={output.results} />;
    case "getEmployeeDirectory":
      return <DirectoryCards people={output.people} />;
    case "getLeaveBalance":
      return <LeaveBalances balances={output.balances} />;
    case "requestTimeOff":
      return <LeaveRequestCard request={output.request} />;
    case "listPendingApprovals":
      return <PendingApprovals pending={output.pending} />;
    case "approveLeave":
      return <ApprovalResultCard result={output.result} />;
    case "getPayslip":
      return <Payslip payslip={output.payslip} />;
    default:
      return (
        <pre className="overflow-x-auto rounded-lg border bg-muted p-2 text-[11px]">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}
