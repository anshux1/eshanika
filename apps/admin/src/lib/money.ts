// Database money is INR decimal strings (Numeric(12,2)); Razorpay amounts are integer paise.
// Conversions use string and integer math only, never floats.

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function formatInr(amount: string | number) {
  // Intl formats decimal strings exactly, without converting them to floats.
  return inrFormatter.format(
    amount as Parameters<typeof inrFormatter.format>[0],
  );
}

export function rupeesToPaise(amount: string) {
  const match = DECIMAL_PATTERN.exec(amount.trim());
  if (!match) throw new Error(`Invalid INR amount: ${amount}`);
  const [, sign, rupees, fraction = ""] = match;
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise))
    throw new Error(`INR amount too large: ${amount}`);
  return sign ? -paise : paise;
}

export function paiseToRupees(paise: number) {
  if (!Number.isSafeInteger(paise))
    throw new Error(`Invalid paise amount: ${paise}`);
  const sign = paise < 0 ? "-" : "";
  const absolute = Math.abs(paise);
  const rupees = Math.trunc(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${rupees}.${fraction}`;
}
