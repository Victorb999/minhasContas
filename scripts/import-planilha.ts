/**
 * Importa o histórico da planilha "Financeiro 26.xlsx" (uma aba por mês).
 *
 *   npm run db:import -- "Financeiro 26.xlsx"
 *   npm run db:import -- "Financeiro 26.xlsx" --dry-run
 *
 * Reimportar apaga e recria apenas os lançamentos com source = "planilha".
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { categories, transactions, type TxType } from "../src/db/schema";
import { DEFAULT_CATEGORIES } from "../src/db/default-categories";

const SOURCE = "planilha";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

type Row = { name: string; type: TxType; category: string; amountCents: number; date: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Ordem importa: a primeira regra que casar define a categoria.
const EXPENSE_RULES: [RegExp, string][] = [
  [/aluguel/, "Moradia"],
  [/agua|luz|internet|celular/, "Contas"],
  [/unimed|farmacia|pilates/, "Saúde"],
  [/cartao|fatura/, "Cartão"],
  [/gasolina/, "Transporte"],
  [/action aid/, "Doações"],
  [/cabelo|salao|unha|maquiagem/, "Beleza"],
  [/lancelot|lance|racao/, "Pets"],
  [/curso|enem/, "Educação"],
  [/multa|licenciamento|passaporte|iptu|ipva/, "Impostos e taxas"],
  [/buque|presente|prst|relogio|rifa/, "Presentes"],
  [/colchao|maq/, "Casa"],
  [/cinema|jgos|jogos|unitv|pirataria|zoo/, "Lazer"],
  [/porcaria|pizza|cerveja|churras|padaria|bolo|degusta|ifood|bk/, "Alimentação"],
];

const INCOME_RULES: [RegExp, string][] = [
  [/salario|adiantamento$|hora extra|stefanin/, "Salário"],
  [/recis|fgts/, "Rescisão"],
  [/seguro desemprego/, "Benefícios"],
  [/^ir$|restitui/, "Restituição IR"],
  [/reembolso/, "Reembolso"],
  [/cashback|meliuz/, "Cashback"],
];

function categorize(name: string, type: TxType) {
  const n = norm(name);
  const rules = type === "expense" ? EXPENSE_RULES : INCOME_RULES;
  return rules.find(([re]) => re.test(n))?.[1] ?? (type === "expense" ? "Outros" : "Outras receitas");
}

function num(v: ExcelJS.CellValue): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && "result" in v && typeof v.result === "number") return v.result;
  return null;
}

function str(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("").trim();
  return String(v).trim();
}

function parseSheet(ws: ExcelJS.Worksheet): Row[] {
  const m = ws.name.trim().match(/^(\S+)\s+(\d{2})$/);
  const month = m ? MONTHS.indexOf(norm(m[1]).replace("marco", "março")) : -1;
  if (!m || month < 0) {
    console.warn(`Aba ignorada: "${ws.name}"`);
    return [];
  }
  const date = `20${m[2]}-${String(month + 1).padStart(2, "0")}-01`;
  const rows: Row[] = [];
  const push = (name: string, type: TxType, value: number | null) => {
    if (!value || value <= 0 || !name) return;
    rows.push({ name, type, category: categorize(name, type), amountCents: Math.round(value * 100), date });
  };
  const cell = (ref: string) => ws.getCell(ref).value;

  // Contas fixas: A2:B12 (a linha 11 "Cartões" é a soma das faturas, lançadas separadamente).
  for (let r = 2; r <= 12; r++) {
    if (r === 11) continue;
    push(str(cell(`A${r}`)), "expense", num(cell(`B${r}`)));
  }
  // Faturas de cartão: C20:D21 (MP, NuBank).
  for (let r = 20; r <= 21; r++) {
    const label = str(cell(`C${r}`));
    if (label) push(`Fatura ${label}`, "expense", num(cell(`D${r}`)));
  }
  // Outros gastos (dinheiro/débito): A20:B30.
  for (let r = 20; r <= 30; r++) push(str(cell(`A${r}`)), "expense", num(cell(`B${r}`)));
  // Receitas: C2:D13 (valor + descrição).
  for (let r = 2; r <= 13; r++) {
    push(str(cell(`D${r}`)) || "Receita", "income", num(cell(`C${r}`)));
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--")) ?? "Financeiro 26.xlsx";
  const dryRun = args.includes("--dry-run");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const rows = wb.worksheets.flatMap(parseSheet);

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    const k = r.date.slice(0, 7);
    const t = byMonth.get(k) ?? { income: 0, expense: 0 };
    t[r.type] += r.amountCents;
    byMonth.set(k, t);
  }
  const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  console.table(
    [...byMonth].map(([mes, t]) => ({ mes, receitas: brl(t.income), despesas: brl(t.expense), saldo: brl(t.income - t.expense) })),
  );
  console.log(`${rows.length} lançamentos encontrados.`);
  if (dryRun) {
    for (const r of rows) console.log(r.date, r.type.padEnd(7), r.category.padEnd(16), brl(r.amountCents).padStart(14), r.name);
    return;
  }

  const db = await createDb();
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })))
    .onConflictDoNothing();
  const cats = await db.select().from(categories);
  const catId = (name: string, type: TxType) => {
    const c = cats.find((c) => c.name === name && c.type === type);
    if (!c) throw new Error(`Categoria não encontrada: ${name} (${type})`);
    return c.id;
  };

  await db.delete(transactions).where(eq(transactions.source, SOURCE));
  await db.insert(transactions).values(
    rows.map((r) => ({
      name: r.name,
      type: r.type,
      amountCents: r.amountCents,
      date: r.date,
      categoryId: catId(r.category, r.type),
      source: SOURCE,
    })),
  );
  console.log(`Importados ${rows.length} lançamentos.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
