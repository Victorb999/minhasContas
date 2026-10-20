"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MONTH_SHORT, formatBRL, formatBRLCompact } from "@/lib/format";

const config = {
  income: { label: "Receitas", color: "var(--income)" },
  expense: { label: "Despesas", color: "var(--expense)" },
} satisfies ChartConfig;

export function YearChart({ data }: { data: { month: number; income: number; expense: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: MONTH_SHORT[d.month - 1] }));
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={rows} margin={{ left: -8, right: 4, top: 8 }} barGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval={0} fontSize={11} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          fontSize={10}
          tickFormatter={(v: number) => formatBRLCompact(v).replace("R$", "").trim()}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2.5 rounded-[3px]"
                      style={{ backgroundColor: `var(--color-${String(name)})` }}
                    />
                    {config[name as keyof typeof config]?.label}
                  </span>
                  <span className="tabular font-medium">{formatBRL(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
