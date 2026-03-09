"use client";

import { formatCurrency, formatDateTime, formatSaleNumber, formatPrintOrderNumber } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Sale {
  id: string;
  sale_number: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  sale_items: SaleItem[];
}

interface PrintOrder {
  id: string;
  order_number: number;
  service_type: string;
  total_price: number;
  status: string;
  created_at: string;
}

interface PurchaseHistoryProps {
  sales: Sale[];
  printOrders: PrintOrder[];
}

function SaleStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    completed: "default",
    refunded: "destructive",
    voided: "destructive",
  };
  return (
    <Badge variant={variants[status] || "secondary"} className="capitalize">
      {status}
    </Badge>
  );
}

function PrintStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    completed: "default",
    cancelled: "destructive",
    pending: "secondary",
    in_progress: "secondary",
  };
  return (
    <Badge variant={variants[status] || "secondary"} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function PurchaseHistory({ sales, printOrders }: PurchaseHistoryProps) {
  const t = useTranslations("customers");
  const totalSpent = sales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.total, 0);

  const totalPrintOrders = printOrders
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.total_price, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t.totalSales}</p>
          <p className="text-2xl font-bold">{sales.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t.totalSpent}</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t.printOrdersCount}</p>
          <p className="text-2xl font-bold">
            {printOrders.length} ({formatCurrency(totalPrintOrders)})
          </p>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">{interpolate(t.salesTab, { count: sales.length })}</TabsTrigger>
          <TabsTrigger value="print">
            {interpolate(t.printOrdersTab, { count: printOrders.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          {sales.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t.noPurchaseHistory}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.saleNumber}</TableHead>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.items}</TableHead>
                  <TableHead>{t.payment}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-right">{t.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Link
                        href={`/sales/${sale.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatSaleNumber(sale.sale_number)}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {sale.sale_items.length} item
                        {sale.sale_items.length !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">
                      {sale.payment_method}
                    </TableCell>
                    <TableCell>
                      <SaleStatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="print">
          {printOrders.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t.noPrintOrdersYet}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.orderNumber}</TableHead>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.service}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-right">{t.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/print-orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatPrintOrderNumber(order.order_number)}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateTime(order.created_at)}</TableCell>
                    <TableCell className="capitalize">
                      {order.service_type}
                    </TableCell>
                    <TableCell>
                      <PrintStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
