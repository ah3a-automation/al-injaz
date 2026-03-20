import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/** Format a value for use in <input type="date"> (HTML5 expects yyyy-MM-dd, not full ISO). */
export function formatDateForInput(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}
