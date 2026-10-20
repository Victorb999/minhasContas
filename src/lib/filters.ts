import type { Filters } from "@/lib/queries";

type Params = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Lê os filtros da URL: ?q=&tipo=receita|despesa&cat=ID&de=YYYY-MM-DD&ate=YYYY-MM-DD */
export function parseFilters(sp: Params): Filters {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const tipo = get("tipo");
  const cat = Number(get("cat"));
  return {
    q: get("q").slice(0, 100) || undefined,
    type: tipo === "receita" ? "income" : tipo === "despesa" ? "expense" : undefined,
    categoryId: Number.isInteger(cat) && cat > 0 ? cat : undefined,
    from: ISO_DATE.test(get("de")) ? get("de") : undefined,
    to: ISO_DATE.test(get("ate")) ? get("ate") : undefined,
  };
}

export function filtersToSearch(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.type) p.set("tipo", f.type === "income" ? "receita" : "despesa");
  if (f.categoryId) p.set("cat", String(f.categoryId));
  if (f.from) p.set("de", f.from);
  if (f.to) p.set("ate", f.to);
  return p.toString();
}
