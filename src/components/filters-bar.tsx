"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filtersToSearch } from "@/lib/filters";
import { addDaysISO, monthRange, shiftMonth, todayISO } from "@/lib/format";
import type { CategoryDTO, Filters } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Period = "all" | "this-month" | "last-month" | "this-year" | "last-30" | "custom";

function periodRange(p: Period): Pick<Filters, "from" | "to"> {
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const monthBounds = (y: number, m: number) => {
    const r = monthRange(y, m);
    return { from: r.from, to: addDaysISO(r.to, -1) };
  };
  switch (p) {
    case "this-month":
      return monthBounds(year, month);
    case "last-month": {
      const prev = shiftMonth(year, month, -1);
      return monthBounds(prev.year, prev.month);
    }
    case "this-year":
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    case "last-30":
      return { from: addDaysISO(today, -29), to: today };
    default:
      return {};
  }
}

function detectPeriod(f: Filters): Period {
  if (!f.from && !f.to) return "all";
  for (const p of ["this-month", "last-month", "this-year", "last-30"] as const) {
    const r = periodRange(p);
    if (r.from === f.from && r.to === f.to) return p;
  }
  return "custom";
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "all", label: "Todo o período" },
  { value: "this-month", label: "Este mês" },
  { value: "last-month", label: "Mês passado" },
  { value: "last-30", label: "Últimos 30 dias" },
  { value: "this-year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
];

export function FiltersBar({ filters, categories }: { filters: Filters; categories: CategoryDTO[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");
  const [customPeriod, setCustomPeriod] = useState(false);
  const period = customPeriod ? "custom" : detectPeriod(filters);

  function apply(next: Filters) {
    const qs = filtersToSearch(next);
    startTransition(() => router.replace(qs ? `/lancamentos?${qs}` : "/lancamentos", { scroll: false }));
  }

  // Busca com debounce enquanto digita.
  useEffect(() => {
    if ((filters.q ?? "") === q.trim()) return;
    const t = setTimeout(() => apply({ ...filters, q: q.trim() || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const visibleCats = categories.filter(
    (c) => (!filters.type || c.type === filters.type) && (!c.archived || c.id === filters.categoryId),
  );
  const exportHref = `/api/export${filtersToSearch(filters) ? `?${filtersToSearch(filters)}` : ""}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar pelo nome…"
          className="h-11 pr-9 pl-9 text-base"
          type="search"
          enterKeyHint="search"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
            aria-label="Limpar busca"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { value: undefined, label: "Todos" },
            { value: "expense", label: "Despesas" },
            { value: "income", label: "Receitas" },
          ] as const
        ).map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              const cat = categories.find((c) => c.id === filters.categoryId);
              apply({
                ...filters,
                type: t.value,
                categoryId: t.value && cat && cat.type !== t.value ? undefined : filters.categoryId,
              });
            }}
            className={cn(
              "h-8 rounded-lg text-sm font-medium transition-colors",
              filters.type === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={filters.categoryId ? String(filters.categoryId) : "all"}
          onValueChange={(v) => apply({ ...filters, categoryId: v === "all" ? undefined : Number(v) })}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Todas as categorias</SelectItem>
            {(["expense", "income"] as const).map((type) => {
              const list = visibleCats.filter((c) => c.type === type);
              if (!list.length) return null;
              return (
                <SelectGroup key={type}>
                  <SelectLabel>{type === "expense" ? "Despesas" : "Receitas"}</SelectLabel>
                  {list.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>

        <Select
          value={period}
          onValueChange={(v) => {
            const p = v as Period;
            setCustomPeriod(p === "custom");
            if (p !== "custom") apply({ ...filters, ...periodRange(p), ...(p === "all" && { from: undefined, to: undefined }) });
          }}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {period === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            De
            <Input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => apply({ ...filters, from: e.target.value || undefined })}
              className="h-10"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Até
            <Input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => apply({ ...filters, to: e.target.value || undefined })}
              className="h-10"
            />
          </label>
        </div>
      )}

      <div className="flex justify-end">
        <a href={exportHref} className="flex items-center gap-1 text-xs font-medium text-primary" download>
          <Download className="size-3.5" /> Exportar CSV
        </a>
      </div>
    </div>
  );
}
