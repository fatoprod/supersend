import type { Timestamp } from "firebase/firestore";

/**
 * Format a Firestore Timestamp to a localized date string.
 * Safely handles undefined/null and non-Timestamp values.
 */
export function formatDate(ts: Timestamp | undefined | null): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleDateString();
  } catch {
    return String(ts);
  }
}

/**
 * Download a CSV template file for contact imports.
 * Includes BOM for Brazilian Excel compatibility.
 */
export function downloadCSVTemplate() {
  const csvContent =
    "\uFEFFemail;firstName;lastName;company\nexample@email.com;João;Silva;Empresa X";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "contacts_template.csv";
  link.click();
}
