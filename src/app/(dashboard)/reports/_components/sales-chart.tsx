"use client";

import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";

interface DailySale {
  sale_date: string;
  transaction_count: number;
  total_revenue: number;
}

interface SalesChartProps {
  data: DailySale[];
}

export function SalesChart({ data }: SalesChartProps) {
  const t = useTranslations("reports");
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        {t.noData}
      </div>
    );
  }

  const chartData = data
    .slice()
    .sort((a, b) => a.sale_date.localeCompare(b.sale_date))
    .map((d) => ({
      date: d.sale_date.slice(5), // MM-DD
      revenue: d.total_revenue,
      transactions: d.transaction_count,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${v}`}
        />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, name) =>
            name === "revenue"
              ? formatCurrency(Number(value))
              : String(value ?? 0)}
          labelFormatter={(label) => interpolate(t.dateLabel, { label })}
        />
        <Bar
          yAxisId="left"
          dataKey="revenue"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
          name="revenue"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="transactions"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          dot={false}
          name="transactions"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
