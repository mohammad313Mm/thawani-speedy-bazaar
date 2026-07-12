// Format Iraqi Dinar amounts using Arabic-Indic digits.
const nf = new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 });

export function formatIQD(amount: number): string {
  return `${nf.format(Math.round(amount))} د.ع`;
}

export function formatNumber(n: number): string {
  return nf.format(n);
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${nf.format(Math.round(km * 1000))} م`;
  return `${new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 1 }).format(km)} كم`;
}

export function formatMinutes(min: number): string {
  return `${nf.format(min)} دقيقة`;
}
