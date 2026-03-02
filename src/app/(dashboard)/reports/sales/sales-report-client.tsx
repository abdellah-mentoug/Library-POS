"use client";

import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "../_components/date-range-picker";
import { SalesChart } from "../_components/sales-chart";
import { ExportButtons } from "../_components/export-buttons";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface DailySale {
  sale_date: string;
  transaction_count: number;
  total_revenue: number;
  total_tax: number;
  total_discounts: number;
  average_basket_size: number;
}

interface SalesReportClientProps {
  data: DailySale[];
}

export function SalesReportClient({ data }: SalesReportClientProps) {
  const exportRows = data.map((r) => ({
    sale_date: r.sale_date,
    transaction_count: r.transaction_count,
    total_revenue: r.total_revenue,
    total_tax: r.total_tax,
    total_discounts: r.total_discounts,
    average_basket_size: r.average_basket_size,
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <Suspense>
          <DateRangePicker />
        </Suspense>
        <ExportButtons
          headers={[
            "sale_date",
            "transaction_count",
            "total_revenue",
            "total_tax",
            "total_discounts",
            "average_basket_size",
          ]}
          rows={exportRows}
          filename="sales-report"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sales data for this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Transactions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Discounts</TableHead>
                  <TableHead className="text-right">Avg Basket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.sale_date}>
                    <TableCell>{formatDate(row.sale_date)}</TableCell>
                    <TableCell className="text-center">
                      {row.transaction_count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.total_tax)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.total_discounts)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.average_basket_size)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
