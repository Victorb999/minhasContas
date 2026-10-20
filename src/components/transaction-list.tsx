"use client";

import { CategoryIcon } from "@/components/category-icon";
import { openEditTransaction } from "@/components/editor-store";
import { formatBRL, formatDayLabel, todayISO } from "@/lib/format";
import type { CategoryDTO, TransactionDTO } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function TransactionList({
  transactions,
  categories,
  emptyMessage = "Nenhum lançamento",
}: {
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  emptyMessage?: string;
}) {
  if (transactions.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const today = todayISO();
  const groups: { date: string; items: TransactionDTO[]; net: number }[] = [];
  for (const tx of transactions) {
    let g = groups.at(-1);
    if (!g || g.date !== tx.date) groups.push((g = { date: tx.date, items: [], net: 0 }));
    g.items.push(tx);
    g.net += tx.type === "income" ? tx.amountCents : -tx.amountCents;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.date} className="flex flex-col gap-1">
          <header className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
            <span className="capitalize">{formatDayLabel(g.date, today)}</span>
            <span className="tabular">{formatBRL(g.net)}</span>
          </header>
          <ul className="overflow-hidden rounded-2xl border bg-card">
            {g.items.map((tx) => {
              const cat = byId.get(tx.categoryId);
              return (
                <li key={tx.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openEditTransaction(tx)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-accent"
                  >
                    <CategoryIcon icon={cat?.icon ?? "ellipsis"} color={cat?.color ?? "#94a3b8"} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{tx.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{cat?.name ?? "—"}</span>
                    </span>
                    <span
                      className={cn(
                        "tabular shrink-0 text-sm font-semibold",
                        tx.type === "income" ? "text-income" : "text-foreground",
                      )}
                    >
                      {tx.type === "income" ? "+" : "−"} {formatBRL(tx.amountCents)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
