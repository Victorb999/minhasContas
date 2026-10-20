"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, Trash2 } from "lucide-react";
import { createTransaction, deleteTransaction, updateTransaction, type TransactionInput } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { CategoryIcon } from "@/components/category-icon";
import { closeEditor, useEditor } from "@/components/editor-store";
import { addDaysISO, formatBRL, formatShortDate, todayISO } from "@/lib/format";
import type { CategoryDTO, Suggestion } from "@/lib/queries";
import type { TxType } from "@/db/schema";
import { safeAction } from "@/lib/safe-action";
import { cn } from "@/lib/utils";

const QUICK_CATEGORY_COUNT = 8;
const DESKTOP_QUERY = "(min-width: 1024px)";

function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

export function TransactionDrawer({
  categories,
  suggestions,
}: {
  categories: CategoryDTO[];
  suggestions: Suggestion[];
}) {
  const editor = useEditor();
  const isDesktop = useIsDesktop();

  const form = (variant: "drawer" | "dialog") => (
    // key: reinicia o formulário a cada abertura
    <TransactionForm
      key={editor.nonce}
      variant={variant}
      tx={editor.tx}
      initialType={editor.type}
      categories={categories}
      suggestions={suggestions}
    />
  );

  // Desktop: janela centralizada. Celular: gaveta que sobe de baixo.
  if (isDesktop) {
    return (
      <Dialog open={editor.open} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent
          className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-md"
          onOpenAutoFocus={(e) => {
            // Novo lançamento já começa digitando o valor.
            if (editor.tx) return;
            e.preventDefault();
            document.getElementById("amount")?.focus();
          }}
        >
          {form("dialog")}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={editor.open} onOpenChange={(o) => !o && closeEditor()} repositionInputs={false}>
      <DrawerContent className="mx-auto max-w-lg data-[vaul-drawer-direction=bottom]:max-h-[92dvh]">
        {form("drawer")}
      </DrawerContent>
    </Drawer>
  );
}

function TransactionForm({
  variant,
  tx,
  initialType,
  categories,
  suggestions,
}: {
  variant: "drawer" | "dialog";
  tx: ReturnType<typeof useEditor>["tx"];
  initialType: TxType;
  categories: CategoryDTO[];
  suggestions: Suggestion[];
}) {
  const today = todayISO();
  const [type, setType] = useState<TxType>(tx?.type ?? initialType);
  const [amountCents, setAmountCents] = useState(tx?.amountCents ?? 0);
  const [name, setName] = useState(tx?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(tx?.categoryId ?? null);
  const [date, setDate] = useState(tx?.date ?? today);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const typeCategories = useMemo(
    () =>
      categories.filter((c) => c.type === type && (!c.archived || c.id === categoryId)).sort((a, b) => b.uses - a.uses),
    [categories, type, categoryId],
  );
  const visibleCategories = useMemo(() => {
    if (showAllCategories) return typeCategories;
    const top = typeCategories.slice(0, QUICK_CATEGORY_COUNT);
    const selected = typeCategories.find((c) => c.id === categoryId);
    return selected && !top.includes(selected) ? [...top.slice(0, -1), selected] : top;
  }, [typeCategories, showAllCategories, categoryId]);

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    const pool = suggestions.filter((s) => s.type === type);
    if (!q) return pool.slice(0, 6);
    return pool
      .filter((s) => s.name.toLowerCase().includes(q) && s.name.toLowerCase() !== q)
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
      .slice(0, 6);
  }, [name, suggestions, type]);

  function changeType(next: TxType) {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
  }

  function pickSuggestion(s: Suggestion) {
    setName(s.name);
    const cat = categories.find((c) => c.id === s.categoryId);
    if (cat && !cat.archived) setCategoryId(cat.id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amountCents) return setError("Informe o valor");
    if (!name.trim()) return setError("Informe um nome");
    if (!categoryId) return setError("Escolha uma categoria");
    const input: TransactionInput = { name: name.trim(), type, amountCents, date, categoryId };

    startTransition(async () => {
      if (tx) {
        const res = await safeAction(() => updateTransaction(tx.id, input));
        if (!res.ok) return setError(res.error);
        toast.success("Lançamento atualizado");
        closeEditor();
        return;
      }
      const res = await safeAction(() => createTransaction(input));
      if (!res.ok) return setError(res.error);
      closeEditor();
      toast.success(`${type === "expense" ? "Despesa" : "Receita"} de ${formatBRL(amountCents)} salva`, {
        description: input.name,
        action: {
          label: "Desfazer",
          onClick: () =>
            void safeAction(() => deleteTransaction(res.id)).then((r) =>
              r.ok ? toast("Lançamento removido") : toast.error(r.error),
            ),
        },
      });
    });
  }

  function remove() {
    if (!tx) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const res = await safeAction(() => deleteTransaction(tx.id));
      if (!res.ok) return setError(res.error);
      closeEditor();
      toast("Lançamento excluído");
    });
  }

  const isExpense = type === "expense";
  const title = tx ? "Editar lançamento" : "Novo lançamento";
  const description = "Informe valor, nome, categoria e data";

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      {variant === "drawer" ? (
        <DrawerHeader className="pb-2">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
        </DrawerHeader>
      ) : (
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={cn(
                "h-10 rounded-lg text-sm font-medium transition-colors",
                type === t
                  ? t === "expense"
                    ? "bg-expense text-expense-foreground shadow-sm"
                    : "bg-income text-income-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {t === "expense" ? "Despesa" : "Receita"}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div className="flex flex-col items-center gap-1">
          <label htmlFor="amount" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Valor
          </label>
          <input
            id="amount"
            inputMode="numeric"
            autoComplete="off"
            autoFocus={!tx}
            value={formatBRL(amountCents)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
              setAmountCents(Number(digits || "0"));
            }}
            onFocus={(e) => {
              const el = e.currentTarget;
              requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
            }}
            className={cn(
              "tabular w-full bg-transparent text-center text-4xl font-semibold tracking-tight outline-none",
              amountCents === 0 && "text-muted-foreground/60",
              amountCents > 0 && (isExpense ? "text-expense" : "text-income"),
            )}
          />
        </div>

        {/* Nome + sugestões */}
        <div className="flex flex-col gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isExpense ? "Ex.: Mercado, Luz, iFood…" : "Ex.: Salário, Reembolso…"}
            autoComplete="off"
            enterKeyHint="done"
            className="h-11 text-base"
            maxLength={120}
          />
          {matches.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {matches.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="h-8 shrink-0 rounded-full border bg-card px-3 text-sm whitespace-nowrap active:bg-accent"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Categoria</span>
          <div className="grid grid-cols-4 gap-2">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                aria-pressed={categoryId === c.id}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl border border-transparent p-1.5 text-[11px] leading-tight transition-colors",
                  categoryId === c.id ? "border-primary bg-primary/10 font-medium" : "active:bg-accent",
                )}
              >
                <CategoryIcon icon={c.icon} color={c.color} />
                <span className="line-clamp-2 w-full text-center break-words">{c.name}</span>
              </button>
            ))}
          </div>
          {typeCategories.length > QUICK_CATEGORY_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllCategories((v) => !v)}
              className="flex items-center justify-center gap-1 text-xs font-medium text-primary"
            >
              {showAllCategories ? "Mostrar menos" : `Ver todas (${typeCategories.length})`}
              <ChevronDown className={cn("size-3.5 transition-transform", showAllCategories && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Data */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Data</span>
          <div className="flex gap-2">
            {[
              { label: "Hoje", value: today },
              { label: "Ontem", value: addDaysISO(today, -1) },
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setDate(d.value)}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm",
                  date === d.value ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card",
                )}
              >
                {d.label}
              </button>
            ))}
            <label
              className={cn(
                "relative flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm",
                date !== today && date !== addDaysISO(today, -1)
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "bg-card",
              )}
            >
              <CalendarDays className="size-4" />
              {date !== today && date !== addDaysISO(today, -1) ? formatShortDate(date) : "Outra"}
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 opacity-0"
                aria-label="Escolher data"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-b-xl border-t bg-popover px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          {tx && (
            <Button type="button" variant="destructive" size="lg" className="h-12" onClick={remove} disabled={pending}>
              <Trash2 />
              {confirmDelete ? "Confirmar" : null}
            </Button>
          )}
          <Button type="submit" size="lg" className="h-12 flex-1 text-base" disabled={pending}>
            {pending ? "Salvando…" : tx ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
