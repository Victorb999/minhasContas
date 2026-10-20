import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  BackLink,
  BalanceCard,
  CategoryBreakdown,
  ExcelButton,
  PeriodSwitcher,
  SectionTitle,
} from "@/components/summary";
import { DashboardSkeleton } from "@/components/skeletons";
import { TransactionList } from "@/components/transaction-list";
import { parseBackHref, withBack } from "@/lib/back";
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
  const { m, voltar } = await searchParams;
  await connection();
  const current = parseMonth(todayISO().slice(0, 7))!;
  const { year, month } = parseMonth(typeof m === "string" ? m : null) ?? current;
  const back = parseBackHref(voltar);

  const { from, to } = monthRange(year, month);
  const [summary, categories] = await Promise.all([getPeriodSummary(from, to), getCategories()]);

  const key = monthKey(year, month);
  const here = back ? withBack(`/?m=${key}`, back) : `/?m=${key}`;
  // As setas mantêm o "voltar" para quem veio da tela do ano.
  const monthHref = (d: number) => {
    const p = shiftMonth(year, month, d);
    const href = `/?m=${monthKey(p.year, p.month)}`;
    return back ? withBack(href, back) : href;
  };
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const listHref = (extra: string) => withBack(`/lancamentos?de=${from}&ate=${key}-${lastDay}${extra}`, here);

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <div className="flex flex-col gap-1">
        {back && <BackLink href={back} label="Ano" />}
        <PeriodSwitcher
          label={`${MONTH_NAMES[month - 1]} ${year}`}
          prevHref={monthHref(-1)}
          nextHref={monthHref(1)}
          action={
            <ExcelButton
              href={`/api/export/excel?m=${key}`}
              label={`Baixar planilha de ${MONTH_NAMES[month - 1]} ${year}`}
            />
          }
        />
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {/* Celular: saldo, despesas, receitas, lista. lg: saldo+categorias | lista. xl: três colunas. */}
        <div className="panel flex flex-col gap-5 max-lg:contents xl:contents">
          <div className="flex flex-col gap-5 max-lg:contents xl:panel">
            <div className="max-lg:order-1">
              <BalanceCard totals={summary.totals} caption="Saldo do mês" />
            </div>
            {summary.byCategory.some((c) => c.type === "income") && (
              <section className="flex flex-col gap-2 max-lg:order-3">
                <SectionTitle>Receitas por categoria</SectionTitle>
                <CategoryBreakdown
                  totals={summary.byCategory}
                  categories={categories}
                  type="income"
                  hrefFor={(id) => listHref(`&cat=${id}`)}
                />
              </section>
            )}
          </div>

          <section className="flex flex-col gap-2 max-lg:order-2 xl:panel">
            <SectionTitle>Despesas por categoria</SectionTitle>
            <CategoryBreakdown
              totals={summary.byCategory}
              categories={categories}
              hrefFor={(id) => listHref(`&cat=${id}`)}
            />
          </section>
        </div>

        <section className="panel flex flex-col gap-2 max-lg:order-4">
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
    </div>
  );
}
