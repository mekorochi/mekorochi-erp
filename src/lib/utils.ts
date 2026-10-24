import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | Decimal): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount instanceof Decimal ? amount.toNumber() : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function formatNumber(num: number | string | Decimal, decimals = 2): string {
  const n = typeof num === "string" ? parseFloat(num) : num instanceof Decimal ? num.toNumber() : num;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatWeight(grams: number | string | Decimal): string {
  const g = typeof grams === "string" ? parseFloat(grams) : grams instanceof Decimal ? grams.toNumber() : grams;
  if (g >= 1000) return `${formatNumber(g / 1000)} kg`;
  return `${formatNumber(g, 0)} g`;
}

const UNIT_LABELS: Record<string, string> = {
  PIECE: "pcs", BOX: "box", GRAM: "g", KILOGRAM: "kg",
  LITER: "L", MILLILITER: "mL", METER: "m", SET: "set",
};

export function getUnitLabel(uom: string): string {
  return UNIT_LABELS[uom] || uom.toLowerCase();
}

export function isWeightUnit(uom: string): boolean {
  return ["GRAM", "KILOGRAM", "LITER", "MILLILITER", "METER"].includes(uom);
}

export function generateSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function decimalAdd(...values: (string | number | Decimal)[]): Decimal {
  return values.reduce<Decimal>((sum, v) => sum.plus(new Decimal(v || 0)), new Decimal(0));
}

export function decimalMul(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return new Decimal(a || 0).mul(new Decimal(b || 0));
}

export function decimalDiv(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  const divisor = new Decimal(b || 0);
  if (divisor.isZero()) return new Decimal(0);
  return new Decimal(a || 0).div(divisor);
}

export function roundToTwo(d: Decimal): Decimal {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = convert(intPart) + " Rupees";
  if (decPart > 0) result += " and " + convert(decPart) + " Paise";
  return result + " Only";
}
