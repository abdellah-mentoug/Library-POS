import { requireAdmin } from "@/lib/auth";
import { getPurchaseOrder } from "@/lib/actions/purchases";
import { POStatusBadge } from "../_components/po-status-badge";
import { POActions } from "../_components/po-actions";
import { formatCurrency, formatDate, formatDateTime, formatOrderNumber } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notFound } from "next/navigation";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let po;
  try {
    po = await getPurchaseOrder(id);
  } catch {
    notFound();
  }

  const profileData = po.profiles as { full_name: string } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            {formatOrderNumber(po.po_number)}
          </h1>
          <POStatusBadge status={po.status} />
        </div>
        <POActions poId={po.id} status={po.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium">
                {po.suppliers?.name || "Unknown"}
              </p>
              {po.suppliers?.contact_person && (
                <p className="text-sm text-muted-foreground">
                  {po.suppliers.contact_person}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{formatDateTime(po.created_at)}</p>
            </div>
            {po.expected_date && (
              <div>
                <p className="text-sm text-muted-foreground">Expected Delivery</p>
                <p>{formatDate(po.expected_date)}</p>
              </div>
            )}
            {po.received_date && (
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p>{formatDateTime(po.received_date)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p>{profileData?.full_name || "Unknown"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(po.subtotal)}</span>
            </div>
            {po.tax_total > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">
                  {formatCurrency(po.tax_total)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(po.total)}</span>
            </div>
            {po.notes && (
              <div className="mt-4 border-t pt-3">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty Ordered</TableHead>
                <TableHead className="text-center">Qty Received</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(po.purchase_items as Array<{
                id: string;
                product_id: string;
                quantity_ordered: number;
                quantity_received: number;
                unit_cost: number;
                line_total: number;
                products: { id: string; name: string; barcode: string | null; stock_quantity: number } | null;
              }>).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.products?.name || "Unknown Product"}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.quantity_ordered}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        item.quantity_received >= item.quantity_ordered
                          ? "text-green-600"
                          : item.quantity_received > 0
                            ? "text-orange-600"
                            : ""
                      }
                    >
                      {item.quantity_received}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_cost)}
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
