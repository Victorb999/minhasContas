import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight } from "lucide-react";
import { BalanceCard, CategoryBreakdown, PeriodSwitcher, SectionTitle } from "@/components/summary";
import { DashboardSkeleton } from "@/components/skeletons";
import { YearChart } from "@/components/year-chart";
import { MONTH_NAMES, formatBRL, monthKey, todayISO } from "@/lib/format";
import { getCategories, getYearSummary } from "@/lib/queries";
import { cn } from "@/lib/utils";

export default function YearPage({ searchParams }: PageProps<"/ano">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <YearDashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function YearDashboard({ searchParams }: Pick<PageProps<"/ano">, "searchParams">) {
  const { y } = await searchParams;
  await connection();
  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));
  const year = typeof y === "string" && /^\d{4}$/.test(y) ? Number(y) : currentYear;

  const [summary, categories] = await Promise.all([getYearSummary(year), getCategories()]);

  // Média só dos meses que já tiveram lançamento.
  const activeMonths = summary.byMonth.filter((m) => m.income || m.expense);
  const avgExpense = activeMonths.length
    ? Math.round(activeMonths.reduce((s, m) => s + m.expense, 0) / activeMonths.length)
    : 0;
  const currentMonth = year === currentYear ? Number(today.slice(5, 7)) : 12;

  return (
    <div className="flex flex-col gap-5">
      <PeriodSwitcher label={String(year)} prevHref={`/ano?y=${year - 1}`} nextHref={`/ano?y=${year + 1}`} />

      <BalanceCard totals={summary.totals} caption={`Saldo de ${year}`} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Média de gastos/mês</p>
          <p className="tabular mt-0.5 font-semibold">{formatBRL(avgExpense)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Meses no positivo</p>
          <p className="tabular mt-0.5 font-semibold">
            {activeMonths.filter((m) => m.income >= m.expense).length} de {activeMonths.length}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <SectionTitle>Receitas × despesas</SectionTitle>
        <div className="rounded-2xl border bg-card p-3">
          <YearChart data={summary.byMonth} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Mês a mês</SectionTitle>
        <ul className="overflow-hidden rounded-2xl border bg-card">
          {summary.byMonth
            .filter((m) => m.month <= currentMonth || m.income || m.expense)
            .map((m) => {
              const balance = m.income - m.expense;
              return (
                <li key={m.month} className="border-b last:border-b-0">
                  <Link
                    href={`/?m=${monthKey(year, m.month)}`}
                    className="flex items-center gap-3 px-3 py-2.5 active:bg-accent"
                  >
                    <span className="w-20 text-sm font-medium">{MONTH_NAMES[m.month - 1]}</span>
                    <span className="tabular flex flex-1 flex-col items-end text-xs leading-tight">
                      <span className="text-income">+ {formatBRL(m.income)}</span>
                      <span className="text-expense">− {formatBRL(m.expense)}</span>
                    </span>
                    <span
                      className={cn(
                        "tabular w-24 text-right text-sm font-semibold",
                        balance < 0 ? "text-expense" : "text-income",
                      )}
                    >
                      {formatBRL(balance)}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Despesas por categoria</SectionTitle>
        <CategoryBreakdown
          totals={summary.byCategory}
          categories={categories}
          hrefFor={(id) => `/lancamentos?de=${year}-01-01&ate=${year}-12-31&cat=${id}`}
        />
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Receitas por categoria</SectionTitle>
        <CategoryBreakdown
          totals={summary.byCategory}
          categories={categories}
          type="income"
          hrefFor={(id) => `/lancamentos?de=${year}-01-01&ate=${year}-12-31&cat=${id}`}
        />
      </section>
    </div>
  );
}
