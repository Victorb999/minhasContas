import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildMonthWorkbook, buildYearWorkbook } from "@/lib/excel";
import { parseMonth } from "@/lib/format";

// /api/export/excel?m=2026-10 (mês) ou ?y=2026 (ano)
export async function GET(request: NextRequest) {
  await requireAuth();
  const params = request.nextUrl.searchParams;
  const month = parseMonth(params.get("m"));
  const year = params.get("y");

  let result;
  if (month) result = await buildMonthWorkbook(month.year, month.month);
  else if (year && /^\d{4}$/.test(year)) result = await buildYearWorkbook(Number(year));
  else return Response.json({ error: "Informe ?m=AAAA-MM ou ?y=AAAA" }, { status: 400 });

  const buffer = await result.wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
