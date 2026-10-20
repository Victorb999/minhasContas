import { Suspense } from "react";
import { connection } from "next/server";
import { FiltersBar } from "@/components/filters-bar";
import { ListSkeleton } from "@/components/skeletons";
import { TransactionList } from "@/components/transaction-list";
import { parseFilters } from "@/lib/filters";
import { formatBRL } from "@/lib/format";
import { getCategories, searchTransactions } from "@/lib/queries";

export default function TransactionsPage({ searchParams }: PageProps<"/lancamentos">) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pt-2 text-lg font-semibold tracking-tight">Lançamentos</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/lancamentos">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  await connection();
  const [result, categories] = await Promise.all([searchTransactions(filters), getCategories()]);
  const { totals } = result;

  return (
    <>
      <FiltersBar filters={filters} categories={categories} />

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
    </>
  );
}
