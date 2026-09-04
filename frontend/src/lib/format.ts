// Small display helpers. Xano timestamps arrive as epoch-ms.

export function formatDate(epochms: number | null | undefined): string {
  if (epochms == null) return "—";
  const d = new Date(Number(epochms));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(epochms: number | null | undefined): string {
  if (epochms == null) return "—";
  const d = new Date(Number(epochms));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAmount(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat().format(Number(n));
}

export function humanize(s: string): string {
  return s.replace(/_/g, " ");
}
