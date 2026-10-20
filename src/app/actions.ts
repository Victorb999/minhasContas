"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { categories, getDb, transactions } from "@/db";
import { requireAuth } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, checkPassword, createSessionToken } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false, error }) as const;

function refreshAll() {
  revalidatePath("/", "layout");
}

// ---------- Sessão ----------

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(password))) return fail("Senha incorreta");
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- Lançamentos ----------

const transactionInput = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(120),
  type: z.enum(["income", "expense"]),
  amountCents: z.number().int().positive("Informe um valor").max(10_000_000_000),
  date: z.iso.date("Data inválida"),
  categoryId: z.number().int().positive("Escolha uma categoria"),
});

export type TransactionInput = z.infer<typeof transactionInput>;

async function validateTransaction(input: TransactionInput) {
  const parsed = transactionInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const db = await getDb();
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, parsed.data.categoryId), eq(categories.type, parsed.data.type)));
  if (!cat) return { error: "Categoria inválida para este tipo" };
  return { data: parsed.data };
}

export async function createTransaction(
  input: TransactionInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireAuth();
  const v = await validateTransaction(input);
  if (!v.data) return fail(v.error);
  const db = await getDb();
  const [row] = await db.insert(transactions).values(v.data).returning({ id: transactions.id });
  refreshAll();
  return { ok: true, id: row.id };
}

export async function updateTransaction(id: number, input: TransactionInput): Promise<ActionResult> {
  await requireAuth();
  const v = await validateTransaction(input);
  if (!v.data) return fail(v.error);
  const db = await getDb();
  await db.update(transactions).set(v.data).where(eq(transactions.id, id));
  refreshAll();
  return { ok: true };
}

export async function deleteTransaction(id: number): Promise<ActionResult> {
  await requireAuth();
  const db = await getDb();
  await db.delete(transactions).where(eq(transactions.id, id));
  refreshAll();
  return { ok: true };
}

// ---------- Categorias ----------

const categoryInput = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(40),
  type: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Cor inválida"),
  icon: z.string().min(1).max(40),
});

export type CategoryInput = z.infer<typeof categoryInput>;

function isUniqueViolation(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  if ("code" in e && e.code === "23505") return true;
  return "cause" in e && isUniqueViolation(e.cause);
}

export async function saveCategory(id: number | null, input: CategoryInput): Promise<ActionResult> {
  await requireAuth();
  const parsed = categoryInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const db = await getDb();
  try {
    if (id) {
      // O tipo não muda depois de criada: os lançamentos dependem dele.
      const { name, color, icon } = parsed.data;
      await db.update(categories).set({ name, color, icon }).where(eq(categories.id, id));
    } else {
      const [{ last }] = await db.select({ last: max(categories.sortOrder) }).from(categories);
      await db.insert(categories).values({ ...parsed.data, sortOrder: (last ?? 0) + 1 });
    }
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Já existe uma categoria com esse nome");
    throw e;
  }
  refreshAll();
  return { ok: true };
}

export async function setCategoryArchived(id: number, archived: boolean): Promise<ActionResult> {
  await requireAuth();
  const db = await getDb();
  await db.update(categories).set({ archived }).where(eq(categories.id, id));
  refreshAll();
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  await requireAuth();
  const db = await getDb();
  const [used] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, id))
    .limit(1);
  if (used) return fail("Categoria em uso: arquive em vez de excluir");
  await db.delete(categories).where(eq(categories.id, id));
  refreshAll();
  return { ok: true };
}
