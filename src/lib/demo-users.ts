import type { Role } from "@/lib/rbac";

// The four demo accounts. Shared by the seed script and the login page so the
// "login as" buttons always match what's in the database.
export const DEMO_PASSWORD = "password123";

export type DemoUser = {
  email: string;
  name: string;
  role: Role;
  title: string;
  department: string;
  location: string;
  blurb: string; // shown on the login card
};

export const DEMO_USERS: DemoUser[] = [
  {
    email: "employee@acme.test",
    name: "Erin Employee",
    role: "EMPLOYEE",
    title: "Software Engineer",
    department: "Engineering",
    location: "Austin, TX",
    blurb: "Sees only their own data. Tools that touch other people get denied.",
  },
  {
    email: "manager@acme.test",
    name: "Marcus Manager",
    role: "MANAGER",
    title: "Engineering Manager",
    department: "Engineering",
    location: "Austin, TX",
    blurb: "Adds visibility into direct reports and can approve their leave.",
  },
  {
    email: "hr@acme.test",
    name: "Hana HR",
    role: "HR_ADMIN",
    title: "HR Business Partner",
    department: "People",
    location: "Remote",
    blurb: "Company-wide directory, compensation, and payslip access.",
  },
  {
    email: "admin@acme.test",
    name: "Sam Super",
    role: "SUPER_ADMIN",
    title: "Platform Administrator",
    department: "IT",
    location: "Remote",
    blurb: "Everything HR can do, plus platform settings.",
  },
];
