export const TIME_ZONE = "America/Sao_Paulo";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatBRL = (cents: number) => brl.format(cents / 100);
export const formatBRLCompact = (cents: number) => brlCompact.format(cents / 100);

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Data de hoje (YYYY-MM-DD) no fuso de Brasília. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-10" -> { year: 2026, month: 10 } (mês 1-12). Inválido -> null. */
export function parseMonth(value: string | undefined | null) {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

export function shiftMonth(year: number, month: number, delta: number) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthRange(year: number, month: number) {
  const next = shiftMonth(year, month, 1);
  return { from: `${monthKey(year, month)}-01`, to: `${monthKey(next.year, next.month)}-01` };
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

/** "2026-10-20" -> "Hoje" / "Ontem" / "seg., 20 de out." */
export function formatDayLabel(iso: string, today = todayISO()) {
  if (iso === today) return "Hoje";
  if (iso === addDaysISO(today, -1)) return "Ontem";
  return weekday.format(new Date(`${iso}T12:00:00Z`));
}

export function formatShortDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
