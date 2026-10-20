import { Suspense } from "react";
import { connection } from "next/server";
import { FiltersBar } from "@/components/filters-bar";
import { ListSkeleton } from "@/components/skeletons";
import { BackLink } from "@/components/summary";
import { TransactionList } from "@/components/transaction-list";
import { parseBackHref } from "@/lib/back";
import { parseFilters } from "@/lib/filters";
import { formatBRL } from "@/lib/format";
import { getCategories, searchTransactions } from "@/lib/queries";

export default function TransactionsPage({ searchParams }: PageProps<"/lancamentos">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/lancamentos">, "searchParams">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const back = parseBackHref(sp.voltar);
  await connection();
  const [result, categories] = await Promise.all([searchTransactions(filters), getCategories()]);
  const { totals } = result;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8">
      <div className="panel flex flex-col gap-4">
        <div className="flex flex-col gap-1 pt-2 lg:pt-0">
          {back && <BackLink href={back} />}
          <h1 className="text-lg font-semibold tracking-tight lg:text-2xl">Lançamentos</h1>
        </div>

        <FiltersBar filters={filters} categories={categories} backHref={back} />

        <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-card p-3 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground">Receitas</p>
            <p className="tabular text-sm font-semibold text-income">{formatBRL(totals.income)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Despesas</p>
            <p className="tabular text-sm font-semibold text-expense">{formatBRL(totals.expense)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Saldo</p>
            <p className="tabular text-sm font-semibold">{formatBRL(totals.income - totals.expense)}</p>
          </div>
        </div>
      </div>

      <div className="panel flex flex-col gap-3">
        <p className="px-1 text-xs text-muted-foreground">
          {result.total === 0
            ? "Nada encontrado"
            : result.total > result.transactions.length
              ? `Mostrando ${result.transactions.length} de ${result.total} lançamentos`
              : `${result.total} lançamento${result.total === 1 ? "" : "s"}`}
        </p>

        <TransactionList
          transactions={result.transactions}
          categories={categories}
          emptyMessage="Nenhum lançamento com esses filtros"
        />
      </div>
    </div>
  );
}
