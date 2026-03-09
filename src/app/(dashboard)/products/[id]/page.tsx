import { getAuthUser } from "@/lib/auth";
import { getProduct } from "@/lib/actions/products";
import { getStockMovements } from "@/lib/actions/stock";
import { getTranslations } from "@/lib/i18n/t-server";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { BarcodeLabel } from "../_components/barcode-label";
import { StockAdjustmentDialog } from "../_components/stock-adjustment-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, PackagePlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct } from "@/lib/actions/products";
import { redirect } from "next/navigation";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [t, tc] = await Promise.all([
    getTranslations("products"),
    getTranslations("common"),
  ]);
  const user = await getAuthUser();
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  const stockMovements = await getStockMovements(id);
  const isAdmin = user.role === "admin";

  async function handleDelete() {
    "use server";
    await deleteProduct(id);
    redirect("/products");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <StockAdjustmentDialog
              productId={product.id}
              productName={product.name}
              currentStock={product.stock_quantity}
              trigger={
                <Button variant="outline">
                  <PackagePlus className="mr-2 h-4 w-4" />
                  {t.adjustStock}
                </Button>
              }
            />
            <Button variant="outline" asChild>
              <Link href={`/products/${product.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                {tc.edit}
              </Link>
            </Button>
            <form action={handleDelete}>
              <Button variant="destructive" type="submit">
                <Trash2 className="mr-2 h-4 w-4" />
                {tc.delete}
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {product.description && (
              <div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <p>{product.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{t.category}</p>
              <p>
                {product.categories?.name || (
                  <span className="text-muted-foreground">{t.uncategorized}</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.sku}</p>
              <p>{product.sku || <span className="text-muted-foreground">{tc.notSet}</span>}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.unit}</p>
              <p className="capitalize">{product.unit}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t.purchasePrice}</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(product.purchase_price)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.taxRate}</p>
                <p className="text-lg font-semibold">{product.tax_rate}%</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.stock}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {product.stock_quantity}
                </span>
                {product.stock_quantity === 0 ? (
                  <Badge variant="destructive">{t.outOfStock}</Badge>
                ) : product.stock_quantity <= product.low_stock_threshold ? (
                  <Badge variant="secondary">{t.lowStock}</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">{t.inStock}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.lowStockThreshold}: {product.low_stock_threshold}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {product.barcode && (
        <Card>
          <CardHeader>
            <CardTitle>{t.barcode}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarcodeLabel
              value={product.barcode}
              productName={product.name}
              price={product.purchase_price}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.stockMovements}</CardTitle>
        </CardHeader>
        <CardContent>
          {stockMovements.length === 0 ? (
            <p className="text-muted-foreground">{tc.noResults}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc.date}</TableHead>
                  <TableHead>{t.change}</TableHead>
                  <TableHead>{t.reason}</TableHead>
                  <TableHead>{t.by}</TableHead>
                  <TableHead>{tc.notes}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.map(
                  (movement: {
                    id: string;
                    created_at: string;
                    quantity_change: number;
                    reason: string;
                    profiles: { full_name: string } | null;
                    notes: string | null;
                  }) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {formatDateTime(movement.created_at)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            movement.quantity_change > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {movement.quantity_change > 0 ? "+" : ""}
                          {movement.quantity_change}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">
                        {movement.reason.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {movement.profiles?.full_name || "System"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.notes || "-"}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
