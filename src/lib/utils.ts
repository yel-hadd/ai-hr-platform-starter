import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Salaries are in Moroccan dirham. One formatter, shared by the directory and
// payslip cards so currency rendering can't drift between them.
const madFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
})

export function formatMAD(value: number) {
  return madFormatter.format(value)
}
