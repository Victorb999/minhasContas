"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Plus, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory, setCategoryArchived } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryIcon } from "@/components/category-icon";
import type { CategoryDTO } from "@/lib/queries";
import type { TxType } from "@/db/schema";
import { safeAction } from "@/lib/safe-action";
import { cn } from "@/lib/utils";

type Draft = { id: number | null; name: string; type: TxType; color: string; icon: string; archived: boolean; uses: number };

export function CategoryManager({ categories }: { categories: CategoryDTO[] }) {
  const [type, setType] = useState<TxType>("expense");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const list = categories.filter((c) => c.type === type).sort((a, b) => Number(a.archived) - Number(b.archived));

  function openNew() {
    setError(null);
    setDraft({ id: null, name: "", type, color: CATEGORY_COLORS[0], icon: "ellipsis", archived: false, uses: 0 });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setError(null);
    startTransition(async () => {
      const res = await safeAction(fn);
      if (!res.ok) return setError(res.error ?? "Erro");
      toast.success(success);
      setDraft(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "h-8 rounded-lg text-sm font-medium",
              type === t ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {t === "expense" ? "Despesas" : "Receitas"}
          </button>
        ))}
      </div>

      <ul className="overflow-hidden rounded-2xl border bg-card">
        {list.map((c) => (
          <li key={c.id} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setDraft({ ...c });
              }}
              className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-accent", c.archived && "opacity-50")}
            >
              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
              <span className="flex-1 text-sm font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">
                {c.archived ? "arquivada" : `${c.uses} lanç.`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Button variant="outline" onClick={openNew}>
        <Plus /> Nova categoria
      </Button>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        {draft && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
              <DialogDescription>{draft.type === "expense" ? "Despesa" : "Receita"}</DialogDescription>
            </DialogHeader>
            <form
              id="category-form"
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => saveCategory(draft.id, { name: draft.name, type: draft.type, color: draft.color, icon: draft.icon }),
                  "Categoria salva",
                );
              }}
            >
              <div className="flex items-center gap-3">
                <CategoryIcon icon={draft.icon} color={draft.color} size="lg" />
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Nome"
                  className="h-11 text-base"
                  maxLength={40}
                  autoFocus={!draft.id}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setDraft({ ...draft, color })}
                    aria-label={`Cor ${color}`}
                    className={cn(
                      "size-7 rounded-full ring-offset-2 ring-offset-background",
                      draft.color === color && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Object.keys(CATEGORY_ICONS).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon })}
                    aria-label={icon}
                    className={cn("rounded-lg p-0.5", draft.icon === icon && "bg-primary/15 ring-1 ring-primary")}
                  >
                    <CategoryIcon icon={icon} color={draft.icon === icon ? draft.color : "#94a3b8"} size="sm" />
                  </button>
                ))}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
            <DialogFooter className="flex-row gap-2 sm:justify-between">
              {draft.id && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={pending}
                    aria-label={draft.archived ? "Restaurar" : "Arquivar"}
                    onClick={() =>
                      run(
                        () => setCategoryArchived(draft.id!, !draft.archived),
                        draft.archived ? "Categoria restaurada" : "Categoria arquivada",
                      )
                    }
                  >
                    {draft.archived ? <ArchiveRestore /> : <Archive />}
                  </Button>
                  {draft.uses === 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      disabled={pending}
                      aria-label="Excluir"
                      onClick={() => run(() => deleteCategory(draft.id!), "Categoria excluída")}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              )}
              <Button type="submit" form="category-form" className="flex-1 sm:flex-none" disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
