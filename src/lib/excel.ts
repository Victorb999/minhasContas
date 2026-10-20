import "server-only";
import ExcelJS from "exceljs";
import { MONTH_NAMES, addDaysISO, monthKey, monthRange } from "@/lib/format";
import { exportTransactions, getCategories, type CategoryDTO, type CategoryTotal } from "@/lib/queries";

const MONEY = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const PURPLE = "FF7C3AED";
const GREEN = "FF059669";
const RED = "FFE11D48";

type Tx = Awaited<ReturnType<typeof exportTransactions>>[number];

/**
 * Fórmula com o resultado já calculado: o Excel recalcula ao abrir, mas visualizadores
 * de celular (Arquivos, Drive, WhatsApp) só mostram o valor salvo.
 */
const f = (formula: string, result: number): ExcelJS.CellFormulaValue => ({
  formula,
  result: Math.round(result * 10000) / 10000,
  date1904: false,
});

const sumCents = (rows: Tx[], type: "income" | "expense") =>
  rows.filter((r) => r.type === type).reduce((s, r) => s + r.amountCents, 0);

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PURPLE } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Aba de lançamentos: valor com sinal (receita +, despesa −), filtro e totais que respeitam o filtro. */
function addTransactionsSheet(wb: ExcelJS.Workbook, name: string, rows: Tx[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Data", key: "date", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Nome", key: "name", width: 32 },
    { header: "Tipo", key: "type", width: 10 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Valor", key: "value", width: 16, style: { numFmt: MONEY } },
  ];
  styleHeader(ws.getRow(1));
  for (const r of rows) {
    const row = ws.addRow({
      date: toDate(r.date),
      name: r.name,
      type: r.type === "income" ? "Receita" : "Despesa",
      category: r.category,
      value: ((r.type === "income" ? 1 : -1) * r.amountCents) / 100,
    });
    row.getCell("value").font = { color: { argb: r.type === "income" ? GREEN : RED } };
  }
  const last = rows.length + 1;
  ws.autoFilter = { from: "A1", to: `E${last}` };

  // SUBTOTAL(109) ignora linhas escondidas pelo filtro.
  ws.addRow([]);
  const income = sumCents(rows, "income") / 100;
  const expense = sumCents(rows, "expense") / 100;
  const totals: [string, ExcelJS.CellFormulaValue][] = [
    ["Receitas", f(`SUMIF(C2:C${last},"Receita",E2:E${last})`, income)],
    ["Despesas", f(`-SUMIF(C2:C${last},"Despesa",E2:E${last})`, expense)],
    ["Saldo (filtrado)", f(`SUBTOTAL(109,E2:E${last})`, income - expense)],
  ];
  for (const [label, value] of totals) {
    const row = ws.addRow({ category: label, value });
    row.getCell("category").font = { bold: true };
    row.getCell("value").font = { bold: true };
  }
  return ws;
}

function addCategoryTable(
  ws: ExcelJS.Worksheet,
  title: string,
  totals: CategoryTotal[],
  categories: CategoryDTO[],
  type: "income" | "expense",
) {
  const rows = totals.filter((t) => t.type === type);
  if (!rows.length) return;
  const byId = new Map(categories.map((c) => [c.id, c.name]));
  ws.addRow([]);
  const header = ws.addRow([title, "Valor", "%"]);
  styleHeader(header);
  const first = ws.rowCount + 1;
  const lastRow = first + rows.length - 1;
  const sum = rows.reduce((s, r) => s + r.total, 0);
  for (const r of rows) {
    const n = ws.rowCount + 1;
    const row = ws.addRow([
      byId.get(r.categoryId) ?? "—",
      r.total / 100,
      f(`B${n}/SUM(B$${first}:B$${lastRow})`, sum ? r.total / sum : 0),
    ]);
    row.getCell(2).numFmt = MONEY;
    row.getCell(3).numFmt = "0.0%";
  }
}

function categoryTotals(rows: Tx[], categories: CategoryDTO[]): CategoryTotal[] {
  const idByName = new Map(categories.map((c) => [`${c.type}:${c.name}`, c.id]));
  const map = new Map<string, CategoryTotal>();
  for (const r of rows) {
    const key = `${r.type}:${r.category}`;
    const t = map.get(key) ?? { categoryId: idByName.get(key) ?? 0, type: r.type, total: 0 };
    t.total += r.amountCents;
    map.set(key, t);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Minhas Contas";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  return wb;
}

export async function buildMonthWorkbook(year: number, month: number) {
  const { from, to } = monthRange(year, month);
  const [rows, categories] = await Promise.all([exportTransactions({ from, to: addDaysISO(to, -1) }), getCategories()]);
  rows.reverse(); // ordem cronológica

  const wb = newWorkbook();
  const title = `${MONTH_NAMES[month - 1]} ${year}`;
  const ws = wb.addWorksheet("Resumo");
  ws.columns = [{ width: 24 }, { width: 18 }, { width: 10 }];
  ws.addRow([title]).font = { bold: true, size: 14 };
  ws.addRow([]);
  const income = sumCents(rows, "income") / 100;
  const expense = sumCents(rows, "expense") / 100;
  const summary: [string, number | ExcelJS.CellFormulaValue, string][] = [
    ["Receitas", income, GREEN],
    ["Despesas", expense, RED],
    ["Saldo", f("B3-B4", income - expense), PURPLE],
  ];
  for (const [label, value, color] of summary) {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).numFmt = MONEY;
    row.getCell(2).font = { bold: true, color: { argb: color } };
  }
  const totals = categoryTotals(rows, categories);
  addCategoryTable(ws, "Despesas por categoria", totals, categories, "expense");
  addCategoryTable(ws, "Receitas por categoria", totals, categories, "income");

  addTransactionsSheet(wb, "Lançamentos", rows);
  return { wb, filename: `contas-${monthKey(year, month)}.xlsx` };
}

export async function buildYearWorkbook(year: number) {
  const [rows, categories] = await Promise.all([
    exportTransactions({ from: `${year}-01-01`, to: `${year}-12-31` }),
    getCategories(),
  ]);
  rows.reverse();

  const wb = newWorkbook();
  const ws = wb.addWorksheet("Resumo", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [{ width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }];
  ws.addRow([`Resumo ${year}`]).font = { bold: true, size: 14 };
  ws.addRow([]);
  styleHeader(ws.addRow(["Mês", "Receitas", "Despesas", "Saldo"]));

  const byMonth = MONTH_NAMES.map((name, i) => {
    const key = monthKey(year, i + 1);
    const list = rows.filter((r) => r.date.startsWith(key));
    return { name, list };
  });
  const sums = byMonth.map(({ list }) => ({
    income: sumCents(list, "income") / 100,
    expense: sumCents(list, "expense") / 100,
  }));
  byMonth.forEach(({ name }, i) => {
    const n = ws.rowCount + 1;
    const { income, expense } = sums[i];
    const row = ws.addRow([name, income, expense, f(`B${n}-C${n}`, income - expense)]);
    [2, 3, 4].forEach((c) => (row.getCell(c).numFmt = MONEY));
  });
  const totalIncome = sums.reduce((s, m) => s + m.income, 0);
  const totalExpense = sums.reduce((s, m) => s + m.expense, 0);
  const active = sums.filter((m) => m.expense > 0);
  const total = ws.addRow([
    "Total",
    f("SUM(B4:B15)", totalIncome),
    f("SUM(C4:C15)", totalExpense),
    f("B16-C16", totalIncome - totalExpense),
  ]);
  total.font = { bold: true };
  [2, 3, 4].forEach((c) => (total.getCell(c).numFmt = MONEY));
  const avgExpense = active.length ? active.reduce((s, m) => s + m.expense, 0) / active.length : 0;
  const avg = ws.addRow(["Média de gastos/mês", null, f('AVERAGEIF(C4:C15,">0")', avgExpense)]);
  avg.getCell(3).numFmt = MONEY;

  const totals = categoryTotals(rows, categories);
  addCategoryTable(ws, "Despesas por categoria", totals, categories, "expense");
  addCategoryTable(ws, "Receitas por categoria", totals, categories, "income");

  // Uma aba por mês com lançamentos, como na planilha antiga, e uma com o ano inteiro.
  for (const { name, list } of byMonth) {
    if (list.length) addTransactionsSheet(wb, `${name} ${year}`, list);
  }
  addTransactionsSheet(wb, "Todos", rows);
  return { wb, filename: `contas-${year}.xlsx` };
}
