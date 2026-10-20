import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { formatBRL } from "@/lib/format";
import type { CategoryDTO, CategoryTotal, Totals } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 flex h-9 w-fit items-center gap-1 rounded-full pr-3 pl-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <ChevronLeft className="size-5" />
      {label}
    </Link>
  );
}

export function PeriodSwitcher({
  label,
  prevHref,
  nextHref,
  action,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  action?: React.ReactNode;
}) {
  const btn =
    "flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent active:bg-accent";
  return (
    <div className="flex items-center gap-1">
      <Link href={prevHref} className={cn(btn, "-ml-2")} aria-label="Anterior" scroll={false}>
        <ChevronLeft className="size-5" />
      </Link>
      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight lg:text-2xl">{label}</h1>
      <Link href={nextHref} className={btn} aria-label="Próximo" scroll={false}>
        <ChevronRight className="size-5" />
      </Link>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** Link de download da planilha (.xlsx) do período. */
export function ExcelButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      aria-label={label}
      title={label}
      className="flex h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium text-income transition-colors hover:bg-accent"
    >
      <FileSpreadsheet className="size-4" />
      Excel
    </a>
  );
}

export function BalanceCard({ totals, caption }: { totals: Totals; caption: string }) {
  const balance = totals.income - totals.expense;
  return (
    <div className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-800 p-5 text-white shadow-lg shadow-primary/20 dark:from-violet-700 dark:to-purple-950">
      <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10" />
      <p className="text-sm text-white/75">{caption}</p>
      <p className="tabular mt-1 text-3xl font-semibold tracking-tight">{formatBRL(balance)}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="flex items-center gap-1 text-xs text-white/75">
            <ArrowDownLeft className="size-3.5 text-emerald-300" /> Receitas
          </p>
          <p className="tabular mt-0.5 font-semibold text-emerald-300">{formatBRL(totals.income)}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="flex items-center gap-1 text-xs text-white/75">
            <ArrowUpRight className="size-3.5 text-rose-300" /> Despesas
          </p>
          <p className="tabular mt-0.5 font-semibold text-rose-200">{formatBRL(totals.expense)}</p>
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function CategoryBreakdown({
  totals,
  categories,
  type = "expense",
  hrefFor,
}: {
  totals: CategoryTotal[];
  categories: CategoryDTO[];
  type?: "expense" | "income";
  hrefFor?: (categoryId: number) => string;
}) {
  const rows = totals.filter((t) => t.type === type);
  const sum = rows.reduce((s, r) => s + r.total, 0);
  if (rows.length === 0) {
    return <p className="rounded-2xl border bg-card py-8 text-center text-sm text-muted-foreground">Sem dados</p>;
  }
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <ul className="flex flex-col gap-1 rounded-2xl border bg-card p-2">
      {rows.map((r) => {
        const cat = byId.get(r.categoryId);
        const pct = sum ? (r.total / sum) * 100 : 0;
        const color = cat?.color ?? "#94a3b8";
        const content = (
          <>
            <CategoryIcon icon={cat?.icon ?? "ellipsis"} color={color} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{cat?.name ?? "—"}</span>
                <span className="tabular shrink-0 font-semibold">{formatBRL(r.total)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </span>
                <span className="tabular w-10 text-right text-[11px] text-muted-foreground">
                  {pct.toFixed(pct < 10 ? 1 : 0)}%
                </span>
              </span>
            </span>
          </>
        );
        const cls = cn(
          "flex items-center gap-3 rounded-xl px-2 py-2",
          hrefFor && "active:bg-accent hover:bg-accent/60",
        );
        return (
          <li key={`${r.type}-${r.categoryId}`}>
            {hrefFor ? (
              <Link href={hrefFor(r.categoryId)} className={cls}>
                {content}
              </Link>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
