import { getAuthUser } from "@/lib/auth";
import { getSale } from "@/lib/actions/sales";
import { SaleDetailActions } from "../_components/sale-detail-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDateTime,
  formatSaleNumber,
} from "@/lib/utils/format";
import { notFound } from "next/navigation";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  const { id } = await params;

  let sale;
  try {
    sale = await getSale(id);
  } catch {
    notFound();
  }

  const customerData = sale.customers as { name: string } | null;
  const cashierData = sale.profiles as { full_name: string } | null;
  const voidedByData = sale.voided_profile as { full_name: string } | null;
  const saleItems = sale.sale_items as Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_amount: number;
    discount_amount: number;
    line_total: number;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            {formatSaleNumber(sale.sale_number)}
          </h1>
          <Badge
            variant={
              sale.status === "completed" ? "default" : "destructive"
            }
            className="capitalize"
          >
            {sale.status}
          </Badge>
        </div>
        <SaleDetailActions
          saleId={sale.id}
          saleNumber={formatSaleNumber(sale.sale_number)}
          status={sale.status}
          isAdmin={user.role === "admin"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sale Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>{formatDateTime(sale.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cashier</p>
              <p>{cashierData?.full_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p>{customerData?.name || "Walk-in"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="capitalize">{sale.payment_method}</p>
            </div>
            {sale.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap text-sm">{sale.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.tax_total > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(sale.tax_total)}</span>
              </div>
            )}
            {sale.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">
                  -{formatCurrency(sale.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span>{formatCurrency(sale.amount_paid)}</span>
            </div>
            {sale.change_given > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change</span>
                <span>{formatCurrency(sale.change_given)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {sale.status === "voided" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Void Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Voided By</p>
              <p>{voidedByData?.full_name || "Unknown"}</p>
            </div>
            {sale.voided_at && (
              <div>
                <p className="text-sm text-muted-foreground">Voided At</p>
                <p>{formatDateTime(sale.voided_at)}</p>
              </div>
            )}
            {sale.void_reason && (
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p>{sale.void_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Items ({saleItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.product_name}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.discount_amount > 0
                      ? `-${formatCurrency(item.discount_amount)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.line_total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
