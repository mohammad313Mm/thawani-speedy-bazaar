// Phone-only authentication helpers.
// Supabase requires an email or phone identifier — we synthesize a stable
// email from the normalized phone so users only ever enter phone + password.
// The real phone is also stored in user metadata and the profile row.

export function normalizePhone(input: string): string | null {
  if (!input) return null;
  // Keep digits only; convert Arabic-Indic digits too.
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  const digits = input
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits;
}

const AUTH_EMAIL_DOMAIN = "thawani.app";

export function phoneToEmail(normalized: string): string {
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
}
