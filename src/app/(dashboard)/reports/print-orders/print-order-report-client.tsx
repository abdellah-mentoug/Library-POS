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
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "../_components/date-range-picker";
import { ExportButtons } from "../_components/export-buttons";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface PrintOrderSummary {
  order_date: string;
  status: string;
  order_count: number;
  total_value: number;
  paid_value: number;
  unpaid_value: number;
}

interface Props {
  data: PrintOrderSummary[];
}

export function PrintOrderReportClient({ data }: Props) {
  const totalOrders = data.reduce((sum, r) => sum + r.order_count, 0);
  const totalValue = data.reduce((sum, r) => sum + r.total_value, 0);
  const totalPaid = data.reduce((sum, r) => sum + r.paid_value, 0);
  const totalUnpaid = data.reduce((sum, r) => sum + r.unpaid_value, 0);

  const exportRows = data.map((r) => ({
    order_date: r.order_date,
    status: r.status,
    order_count: r.order_count,
    total_value: r.total_value,
    paid_value: r.paid_value,
    unpaid_value: r.unpaid_value,
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalUnpaid)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Suspense>
          <DateRangePicker />
        </Suspense>
        <ExportButtons
          headers={[
            "order_date",
            "status",
            "order_count",
            "total_value",
            "paid_value",
            "unpaid_value",
          ]}
          rows={exportRows}
          filename="print-order-report"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No print order data for this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={`${row.order_date}-${row.status}-${i}`}>
                    <TableCell>{formatDate(row.order_date)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.order_count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.total_value)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(row.paid_value)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(row.unpaid_value)}
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
