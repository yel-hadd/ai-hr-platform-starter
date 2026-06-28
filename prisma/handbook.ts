// Seed corpus. Authored in markdown for readability; the seed converts it to HTML
// for storage and chunks the HTML by heading (see prisma/seed.ts). Edit here, then
// `npm run db:reset` to re-seed (seeding skips when documents already exist).
import type { DocStatus, DocVisibility } from "@prisma/client";

export type SeedDocument = {
  slug: string;
  title: string;
  visibility: DocVisibility;
  status?: DocStatus; // defaults to PUBLISHED
  tags?: string[];
  content: string; // markdown; use ## / ### headings for citable sections
};

export type SeedCollection = {
  slug: string;
  name: string;
  description: string;
  image?: string; // decorative cover (stored on KbCollection.image)
  order: number;
  documents: SeedDocument[];
};

// A tiny gradient SVG as a data URL — a pleasant default cover so the collection
// UI looks complete out of the box (admins can replace it with an uploaded image).
// Rendered via <img>, so the SVG is inert (no script execution).
const cover = (a: string, b: string, c: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="1200" height="300" fill="url(#g)"/></svg>`,
  )}`;

export const KB_COLLECTIONS: SeedCollection[] = [
  {
    slug: "employee-handbook",
    name: "Employee Handbook",
    description: "Company-wide policies every employee can read.",
    image: cover("#6366f1", "#3b82f6", "#06b6d4"),
    order: 0,
    documents: [
      {
        slug: "leave-and-time-off",
        title: "Leave & Time Off",
        visibility: "ALL_EMPLOYEES",
        tags: ["leave", "vacation", "benefits"],
        content: `## Paid Time Off (Vacation)

Full-time employees accrue 20 days of paid vacation per year. Vacation must be requested in advance through the platform and approved by your manager. Unused days roll over up to a maximum of 5 days into the next calendar year. Vacation cannot be taken before it has accrued except with HR approval.

## Sick Leave

Employees receive 10 paid sick days per year. Sick leave can be used for personal illness or to care for an immediate family member. For absences longer than three consecutive days, a doctor's note may be required. Sick days do not roll over and are not paid out on termination.

## Parental Leave

The company offers 16 weeks of fully paid parental leave for all new parents, including birth, adoption, and foster placement, regardless of gender. Leave must be taken within 12 months of the child's arrival. Employees are eligible after 6 months of employment. Contact HR at least 30 days before your intended start date.`,
      },
      {
        slug: "work-and-compensation",
        title: "Work & Compensation",
        visibility: "ALL_EMPLOYEES",
        tags: ["remote", "expenses", "benefits"],
        content: `## Remote Work Policy

Most roles are eligible for hybrid or fully remote work. Hybrid employees are expected in the office at least two days per week. Remote employees must be reachable during core hours of 10am–4pm in their team's primary time zone. A one-time home-office stipend of $500 is available; request it through Expenses.

## Working Hours and Overtime

Standard working hours are 40 per week. Core collaboration hours are 10am–4pm local time. Non-exempt employees are eligible for overtime pay at 1.5x for hours worked beyond 40 in a week, which must be pre-approved by a manager. Flexible start and end times are permitted as long as core hours are covered.

## Expense Reimbursement

Business expenses are reimbursed when submitted with a receipt within 30 days. Eligible expenses include travel, client meals (up to $75 per person), software subscriptions, and professional development. Expenses over $1,000 require manager pre-approval. Reimbursements are paid with the next payroll cycle.

## Health Benefits

The company covers 100% of the employee premium and 70% of dependent premiums for medical, dental, and vision insurance. Coverage begins on the first day of the month after your start date. Open enrollment occurs each November. A $1,200 annual wellness reimbursement covers gym memberships and mental-health services.`,
      },
      {
        slug: "workplace-and-equipment",
        title: "Workplace & Equipment",
        visibility: "ALL_EMPLOYEES",
        tags: ["conduct", "security", "equipment"],
        content: `## Code of Conduct

All employees are expected to treat colleagues with respect and maintain a harassment-free workplace. Discrimination based on race, gender, age, religion, disability, or sexual orientation is prohibited. Violations should be reported to HR or through the anonymous ethics hotline. Confidential company information must not be shared externally.

## Performance Reviews

Formal performance reviews are conducted twice a year, in June and December. Reviews include self-assessment, manager feedback, and goal setting for the next cycle. Compensation adjustments and promotions are typically decided during the December cycle. Continuous feedback is encouraged outside of formal reviews.

## Equipment and Security

Each employee is issued a company laptop. Devices must use full-disk encryption and the company password manager. Report lost or stolen equipment to IT immediately. Personal use of company devices should be minimal. Returning equipment is required within 7 days of leaving the company.`,
      },
      {
        // Seeded as a DRAFT to demonstrate that drafts never reach the reader or
        // the chatbot until published (HARI-62).
        slug: "relocation-policy",
        title: "Relocation Policy (draft)",
        visibility: "ALL_EMPLOYEES",
        status: "DRAFT",
        content: `## Relocation Support

DRAFT — under review by HR. The company may offer relocation assistance for eligible roles. Details to be finalized.`,
      },
    ],
  },
  {
    slug: "management",
    name: "Management",
    description: "Guidance for managers and above.",
    image: cover("#f59e0b", "#f97316", "#ef4444"),
    order: 1,
    documents: [
      {
        slug: "manager-playbook",
        title: "Manager Playbook",
        visibility: "MANAGERS",
        tags: ["managers", "reviews"],
        content: `## Approving Leave

Review your team's pending time-off requests promptly. Check coverage and the requester's balance before approving. Approvals deduct from the employee's balance automatically; rejections should include a brief reason shared directly with the employee.

## Conducting Reviews

Run review conversations twice a year. Prepare with concrete examples, align on goals for the next cycle, and document outcomes. Calibrate ratings with peer managers before the December compensation cycle.`,
      },
    ],
  },
  {
    slug: "hr-internal",
    name: "HR Internal",
    description: "Restricted documents for HR administrators only.",
    image: cover("#10b981", "#14b8a6", "#0ea5e9"),
    order: 2,
    documents: [
      {
        slug: "compensation-bands",
        title: "Compensation Bands",
        visibility: "HR_ONLY",
        tags: ["compensation", "hr"],
        content: `## Salary Bands

Each role maps to a salary band with a defined minimum, midpoint, and maximum. New hires should target the band midpoint unless experience justifies otherwise. Bands are reviewed annually against market data.

## Off-cycle Adjustments

Off-cycle increases require HR director approval and a written justification (retention risk, scope change, or correction of an internal-equity gap). Record every adjustment with its rationale for audit.`,
      },
    ],
  },
];
