import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseFilters } from "@/lib/filters";
import { exportTransactions } from "@/lib/queries";

// CSV com ";" e vírgula decimal, que o Excel em português abre direto.
export async function GET(request: NextRequest) {
  await requireAuth();
  const filters = parseFilters(Object.fromEntries(request.nextUrl.searchParams));
  const rows = await exportTransactions(filters);

  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    "Data;Nome;Tipo;Categoria;Valor",
    ...rows.map((r) =>
      [
        r.date.split("-").reverse().join("/"),
        esc(r.name),
        r.type === "income" ? "Receita" : "Despesa",
        esc(r.category),
        ((r.type === "income" ? 1 : -1) * r.amountCents / 100).toFixed(2).replace(".", ","),
      ].join(";"),
    ),
  ];

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lancamentos.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
