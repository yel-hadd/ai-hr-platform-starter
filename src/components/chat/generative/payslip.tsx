import { Receipt } from "lucide-react";

export function Payslip({
  payslip,
}: {
  payslip: {
    employeeName: string;
    period: string;
    grossMonthly: number;
    tax: number;
    netMonthly: number;
  };
}) {
  const row = (label: string, value: number, strong = false) => (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "tabular-nums"}>
        ${value.toLocaleString()}
      </span>
    </div>
  );
  return (
    <div className="max-w-xs rounded-lg border bg-card p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Receipt className="size-4 text-muted-foreground" />
        <span className="font-medium">{payslip.employeeName}</span>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{payslip.period}</p>
      <div className="space-y-1">
        {row("Gross", payslip.grossMonthly)}
        {row("Tax (22%)", -payslip.tax)}
        <div className="my-1 border-t" />
        {row("Net", payslip.netMonthly, true)}
      </div>
    </div>
  );
}
