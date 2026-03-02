import { format, formatDistanceToNow } from "date-fns";
import { STORE_CONFIG } from "./constants";

export function formatCurrency(amount: number): string {
  return `${STORE_CONFIG.currencySymbol}${amount.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM dd, yyyy");
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "MMM dd, yyyy HH:mm");
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatSaleNumber(num: number): string {
  return `#${String(num).padStart(6, "0")}`;
}

export function formatOrderNumber(num: number): string {
  return `PO-${String(num).padStart(4, "0")}`;
}

export function formatPrintOrderNumber(num: number): string {
  return `PR-${String(num).padStart(4, "0")}`;
}
