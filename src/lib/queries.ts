import "server-only";
import { and, asc, count, desc, eq, gte, ilike, lt, lte, sql, type SQL } from "drizzle-orm";
import { categories, getDb, transactions, type TxType } from "@/db";

const sumCents = sql`coalesce(sum(${transactions.amountCents}), 0)`.mapWith(Number);
const sumIf = (type: TxType) =>
  sql`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} = ${type}), 0)`.mapWith(
    Number,
  );

export type CategoryDTO = {
  id: number;
  name: string;
  type: TxType;
  color: string;
  icon: string;
  archived: boolean;
  uses: number;
};

export type TransactionDTO = {
  id: number;
  name: string;
  type: TxType;
  amountCents: number;
  date: string;
  categoryId: number;
};

const txColumns = {
  id: transactions.id,
  name: transactions.name,
  type: transactions.type,
  amountCents: transactions.amountCents,
  date: transactions.date,
  categoryId: transactions.categoryId,
};

/** Categorias com contagem de uso (as mais usadas aparecem primeiro no lançamento rápido). */
export async function getCategories(): Promise<CategoryDTO[]> {
  const db = await getDb();
  return db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      color: categories.color,
      icon: categories.icon,
      archived: categories.archived,
      uses: count(transactions.id),
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export type Suggestion = { name: string; categoryId: number; type: TxType; uses: number };

/** Nomes já usados, com a categoria do lançamento mais recente — alimenta o autocomplete. */
export async function getSuggestions(): Promise<Suggestion[]> {
  const db = await getDb();
  const result = await db.execute(sql`
    select distinct on (lower(${transactions.name}))
      ${transactions.name} as name,
      ${transactions.categoryId} as category_id,
      ${transactions.type} as type,
      count(*) over (partition by lower(${transactions.name})) as uses
    from ${transactions}
    order by lower(${transactions.name}), ${transactions.date} desc, ${transactions.id} desc
  `);
  const rows = result.rows as { name: string; category_id: number; type: TxType; uses: string | number }[];
  return rows
    .map((r) => ({ name: r.name, categoryId: Number(r.category_id), type: r.type, uses: Number(r.uses) }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 300);
}

export type Totals = { income: number; expense: number };
export type CategoryTotal = { categoryId: number; type: TxType; total: number };

async function totals(where: SQL | undefined): Promise<Totals> {
  const db = await getDb();
  const [row] = await db
    .select({ income: sumIf("income"), expense: sumIf("expense") })
    .from(transactions)
    .where(where);
  return row;
}

async function byCategory(where: SQL | undefined): Promise<CategoryTotal[]> {
  const db = await getDb();
  return db
    .select({ categoryId: transactions.categoryId, type: transactions.type, total: sumCents })
    .from(transactions)
    .where(where)
    .groupBy(transactions.categoryId, transactions.type)
    .orderBy(desc(sumCents));
}

const between = (from: string, to: string) => and(gte(transactions.date, from), lt(transactions.date, to));

export async function getPeriodSummary(from: string, to: string) {
  const db = await getDb();
  const where = between(from, to);
  const [t, cats, list] = await Promise.all([
    totals(where),
    byCategory(where),
    db.select(txColumns).from(transactions).where(where).orderBy(desc(transactions.date), desc(transactions.id)),
  ]);
  return { totals: t, byCategory: cats, transactions: list as TransactionDTO[] };
}

export async function getYearSummary(year: number) {
  const db = await getDb();
  const where = between(`${year}-01-01`, `${year + 1}-01-01`);
  const month = sql`extract(month from ${transactions.date})`.mapWith(Number);
  const [t, cats, months] = await Promise.all([
    totals(where),
    byCategory(where),
    db
      .select({ month, income: sumIf("income"), expense: sumIf("expense") })
      .from(transactions)
      .where(where)
      .groupBy(month)
      .orderBy(month),
  ]);
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const m = months.find((r) => r.month === i + 1);
    return { month: i + 1, income: m?.income ?? 0, expense: m?.expense ?? 0 };
  });
  return { totals: t, byCategory: cats, byMonth };
}

export type Filters = {
  q?: string;
  type?: TxType;
  categoryId?: number;
  from?: string;
  to?: string; // inclusivo
};

function filterWhere(f: Filters) {
  const conds: SQL[] = [];
  if (f.q) conds.push(ilike(transactions.name, `%${f.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`));
  if (f.type) conds.push(eq(transactions.type, f.type));
  if (f.categoryId) conds.push(eq(transactions.categoryId, f.categoryId));
  if (f.from) conds.push(gte(transactions.date, f.from));
  if (f.to) conds.push(lte(transactions.date, f.to));
  return conds.length ? and(...conds) : undefined;
}

export async function searchTransactions(f: Filters, limit = 300) {
  const db = await getDb();
  const where = filterWhere(f);
  const [t, list, [{ total }]] = await Promise.all([
    totals(where),
    db
      .select(txColumns)
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(limit),
    db.select({ total: count() }).from(transactions).where(where),
  ]);
  return { totals: t, transactions: list as TransactionDTO[], total };
}

export async function exportTransactions(f: Filters) {
  const db = await getDb();
  return db
    .select({
      date: transactions.date,
      name: transactions.name,
      type: transactions.type,
      category: categories.name,
      amountCents: transactions.amountCents,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(filterWhere(f))
    .orderBy(desc(transactions.date), desc(transactions.id));
}
