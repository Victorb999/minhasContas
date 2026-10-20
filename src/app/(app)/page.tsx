import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BalanceCard, CategoryBreakdown, PeriodSwitcher, SectionTitle } from "@/components/summary";
import { DashboardSkeleton } from "@/components/skeletons";
import { TransactionList } from "@/components/transaction-list";
import { MONTH_NAMES, monthKey, monthRange, parseMonth, shiftMonth, todayISO } from "@/lib/format";
import { getCategories, getPeriodSummary } from "@/lib/queries";

export default function MonthPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MonthDashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function MonthDashboard({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { m } = await searchParams;
  await connection();
  const current = parseMonth(todayISO().slice(0, 7))!;
  const { year, month } = parseMonth(typeof m === "string" ? m : null) ?? current;

  const { from, to } = monthRange(year, month);
  const [summary, categories] = await Promise.all([getPeriodSummary(from, to), getCategories()]);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const key = monthKey(year, month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const listHref = (extra: string) => `/lancamentos?de=${from}&ate=${key}-${lastDay}${extra}`;

  return (
    <div className="flex flex-col gap-5">
      <PeriodSwitcher
        label={`${MONTH_NAMES[month - 1]} ${year}`}
        prevHref={`/?m=${monthKey(prev.year, prev.month)}`}
        nextHref={`/?m=${monthKey(next.year, next.month)}`}
      />

      <BalanceCard totals={summary.totals} caption="Saldo do mês" />

      <section className="flex flex-col gap-2">
        <SectionTitle>Despesas por categoria</SectionTitle>
        <CategoryBreakdown
          totals={summary.byCategory}
          categories={categories}
          hrefFor={(id) => listHref(`&cat=${id}`)}
        />
      </section>

      {summary.byCategory.some((c) => c.type === "income") && (
        <section className="flex flex-col gap-2">
          <SectionTitle>Receitas por categoria</SectionTitle>
          <CategoryBreakdown
            totals={summary.byCategory}
            categories={categories}
            type="income"
            hrefFor={(id) => listHref(`&cat=${id}`)}
          />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <SectionTitle
          action={
            <Link href={listHref("")} className="text-xs font-medium text-primary">
              Filtrar
            </Link>
          }
        >
          Lançamentos ({summary.transactions.length})
        </SectionTitle>
        <TransactionList
          transactions={summary.transactions}
          categories={categories}
          emptyMessage="Nenhum lançamento neste mês. Toque no + para adicionar."
        />
      </section>
    </div>
  );
}
