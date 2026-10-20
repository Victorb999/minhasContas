/**
 * Importa o histórico das planilhas "Financeiro AA.xlsx" (uma aba por mês).
 *
 *   npm run db:import -- "Financeiro 26.xlsx"
 *   npm run db:import -- "Financeiro 23.xlsx" "Financeiro 24.xlsx" --dry-run
 *
 * Reimportar substitui apenas os lançamentos importados (source = "planilha") dos meses presentes nos arquivos.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import ExcelJS from "exceljs";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { categories, transactions, type TxType } from "../src/db/schema";
import { DEFAULT_CATEGORIES } from "../src/db/default-categories";

const SOURCE = "planilha";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

type Row = { name: string; type: TxType; category: string; amountCents: number; date: string };
type SheetResult = { month: string; rows: Row[]; sheetExpense: number | null; sheetIncome: number | null };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Ordem importa: a primeira regra que casar define a categoria.
const EXPENSE_RULES: [RegExp, string][] = [
  [/aluguel|condominio/, "Moradia"],
  [/agua|luz|internet|celular/, "Contas"],
  [/unimed|farmacia|pilates|growth|dentista|medic|exame|consulta|remedio|enfermeira|maternida/, "Saúde"],
  [/roupa|chinelo|vestido|jaleco|sapato|tenis/, "Vestuário"],
  [/cart(ao|oes)|fatura|vanessa cartao|cartao vaness/, "Cartão"],
  [/gasolina|estacionamento|passage|uber|onibus|carro/, "Transporte"],
  [/action aid/, "Doações"],
  [/cabelo|salao|unha|maquiagem|corte|tatoo|tattoo|barbearia/, "Beleza"],
  [/lancelot|lance|racao|veterin|pet|tosa|zeedog|patas/, "Pets"],
  [/curso|enem|uni$|^uni |faculdade|fies|concurso|colacao|carteirinha/, "Educação"],
  [/multa|licenciamento|passaporte|iptu|ipva|imposto|detran|crbm|correio/, "Impostos e taxas"],
  [/netflix|spotify|assinatura|gympass|crunchyroll/, "Assinaturas"],
  [/buque|presente|prst|relogio|rifa|alianca|casamento|celebrante|fotos/, "Presentes"],
  [
    /colchao|maq|mesa|movel|moveis|tv$|^tv|faxina|limpeza|eletricista|tinta|carreto|cama|panela|air fryer|cadeira|notebook|suculenta/,
    "Casa",
  ],
  [/cinema|jgos|jogos|jogo|unitv|pirataria|zoo|show|viagem|fim de\s+ano|festa|niver|aniversario|cha /, "Lazer"],
  [
    /porcaria|prcaria|pizza|cerveja|churras|padaria|bolo|degusta|ifood|bk|lanche|mercado|rancho|mcdonald|salgad|almoco/,
    "Alimentação",
  ],
];

const INCOME_RULES: [RegExp, string][] = [
  [/salario|adiantamento$|hora extra|hr extra|stefanin|13|ferias|^gc$/, "Salário"],
  [/recis|fgts|acerto|^multa/, "Rescisão"],
  [/seguro desemprego/, "Benefícios"],
  [/^ir$|restitui|imposto de renda/, "Restituição IR"],
  [/reembolso/, "Reembolso"],
  [/cashback|meliuz/, "Cashback"],
];

function categorize(name: string, type: TxType) {
  const n = norm(name);
  const rules = type === "expense" ? EXPENSE_RULES : INCOME_RULES;
  return rules.find(([re]) => re.test(n))?.[1] ?? (type === "expense" ? "Outros" : "Outras receitas");
}

const isFormula = (v: ExcelJS.CellValue): v is ExcelJS.CellFormulaValue | ExcelJS.CellSharedFormulaValue =>
  typeof v === "object" && v !== null && ("formula" in v || "sharedFormula" in v);

const formulaText = (v: ExcelJS.CellValue) =>
  isFormula(v) ? (("formula" in v ? v.formula : v.sharedFormula) ?? "") : "";

/** Fórmula de soma de intervalo (ex.: SUM(D20:D21)) = subtotal da própria planilha, não um gasto. */
const isRangeSum = (v: ExcelJS.CellValue) => /[A-Z]+\d+:[A-Z]+\d+/i.test(formulaText(v));

function num(v: ExcelJS.CellValue): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (isFormula(v) && typeof v.result === "number") return v.result;
  return null;
}

function str(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "richText" in v)
    return v.richText
      .map((r) => r.text)
      .join("")
      .trim();
  if (isFormula(v)) return typeof v.result === "string" ? v.result.trim() : "";
  return "";
}

/** "Janeiro 26", "Janeiro 2025" -> "2026-01"; abas de resumo retornam null. */
function sheetMonth(name: string) {
  const m = name.trim().match(/^(\S+)\s+(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(norm(m[1]));
  if (month < 0) return null;
  const year = m[2].length === 2 ? `20${m[2]}` : m[2];
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function parseSheet(ws: ExcelJS.Worksheet): SheetResult | null {
  const month = sheetMonth(ws.name);
  if (!month) {
    console.warn(`Aba ignorada: "${ws.name}"`);
    return null;
  }
  const date = `${month}-01`;
  const cell = (ref: string) => ws.getCell(ref).value;
  const label = (ref: string) => norm(str(cell(ref)));
  const rows: Row[] = [];
  const push = (name: string, type: TxType, value: number | null) => {
    if (!value || value <= 0) return;
    rows.push({ name, type, category: categorize(name, type), amountCents: Math.round(value * 100), date });
  };

  // Localiza as seções pelos rótulos da coluna A (as linhas mudam de um ano para outro).
  // Usa a primeira ocorrência: itens da lista também podem se chamar "outros".
  let totalRow = 0;
  let othersRow = 0;
  for (let r = 1; r <= 40; r++) {
    const a = label(`A${r}`);
    if (a === "total" && !totalRow) totalRow = r;
    if (a === "outros" && totalRow && !othersRow) othersRow = r;
  }
  totalRow ||= 14;
  othersRow ||= 19;

  // Contas fixas (A2:B até a linha "Total").
  for (let r = 2; r < totalRow; r++) {
    const a = label(`A${r}`);
    const v = cell(`B${r}`);
    if (a.startsWith("dinheiro")) continue; // "Dinheiro/Débito" = soma da lista "Outros"
    if (isRangeSum(v)) continue; // "Cartões" = soma das faturas, lançadas abaixo
    const name = str(cell(`A${r}`)) || "Diversos";
    push(/^cart(ao|oes)$/.test(a) ? "Fatura cartão" : name, "expense", num(v));
  }

  // Abaixo de "Outros": coluna A/B = gastos avulsos; coluna C/D = faturas por cartão (2025+).
  let cardsDone = false;
  for (let r = othersRow + 1; r <= othersRow + 14; r++) {
    const a = label(`A${r}`);
    if (a.startsWith("total")) break;
    // Aqui até fórmulas de soma são gastos reais (ex.: "Casamento" = SUM(G6:G7)).
    push(str(cell(`A${r}`)) || "Diversos", "expense", num(cell(`B${r}`)));

    const c = label(`C${r}`);
    if (c.startsWith("total")) cardsDone = true;
    if (!cardsDone && c && !isRangeSum(cell(`D${r}`)))
      push(`Fatura ${str(cell(`C${r}`))}`, "expense", num(cell(`D${r}`)));
  }

  // Receitas: C2:D até a linha "Total" (valor em C, descrição em D).
  for (let r = 2; r < totalRow; r++) {
    const v = cell(`C${r}`);
    if (isRangeSum(v)) continue;
    let name = str(cell(`D${r}`));
    if (/^\d+$/.test(name)) name = name === "13" ? "13º salário" : `Receita ${name}`;
    if (!name) name = r === 2 ? "salário" : "Receita";
    push(name, "income", num(v));
  }

  return {
    month,
    rows,
    sheetExpense: num(cell(`B${totalRow}`)),
    sheetIncome: num(cell(`C${totalRow}`)),
  };
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function main() {
  const args = process.argv.slice(2);
  const files = args.filter((a) => !a.startsWith("--"));
  if (!files.length) files.push("Financeiro 26.xlsx");
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose");

  const sheets: SheetResult[] = [];
  for (const file of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    for (const ws of wb.worksheets) {
      const s = parseSheet(ws);
      if (s) sheets.push(s);
    }
  }
  sheets.sort((a, b) => a.month.localeCompare(b.month));
  const rows = sheets.flatMap((s) => s.rows);

  console.table(
    sheets.map((s) => {
      const income = s.rows.filter((r) => r.type === "income").reduce((t, r) => t + r.amountCents, 0);
      const expense = s.rows.filter((r) => r.type === "expense").reduce((t, r) => t + r.amountCents, 0);
      const diff = (sheet: number | null, mine: number) =>
        sheet == null
          ? "?"
          : Math.abs(Math.round(sheet * 100) - mine) <= 1
            ? "ok"
            : brl(mine - Math.round(sheet * 100));
      return {
        mes: s.month,
        receitas: brl(income),
        despesas: brl(expense),
        "dif. receitas": diff(s.sheetIncome, income),
        "dif. despesas": diff(s.sheetExpense, expense),
      };
    }),
  );
  console.log(`${rows.length} lançamentos em ${sheets.length} meses.`);
  if (dryRun) {
    if (verbose) {
      for (const r of rows)
        console.log(r.date, r.type.padEnd(7), r.category.padEnd(16), brl(r.amountCents).padStart(14), r.name);
    }
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

  const dates = sheets.map((s) => `${s.month}-01`);
  await db.delete(transactions).where(and(eq(transactions.source, SOURCE), inArray(transactions.date, dates)));
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
