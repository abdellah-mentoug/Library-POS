"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/lib/actions/purchases";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  purchase_price: number;
}

interface LineItem {
  key: number;
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
}

interface POFormProps {
  suppliers: Supplier[];
  products: Product[];
}

export function POForm({ suppliers, products }: POFormProps) {
  const router = useRouter();
  const t = useTranslations("purchases");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { key: 1, product_id: "", quantity_ordered: 1, unit_cost: 0 },
  ]);
  const [nextKey, setNextKey] = useState(2);

  function addLineItem() {
    setItems([
      ...items,
      { key: nextKey, product_id: "", quantity_ordered: 1, unit_cost: 0 },
    ]);
    setNextKey(nextKey + 1);
  }

  function removeLineItem(key: number) {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.key !== key));
  }

  function updateItem(key: number, field: keyof LineItem, value: string | number) {
    setItems(
      items.map((item) => {
        if (item.key !== key) return item;
        if (field === "product_id") {
          const product = products.find((p) => p.id === value);
          return {
            ...item,
            product_id: value as string,
            unit_cost: product ? product.purchase_price : 0,
          };
        }
        return { ...item, [field]: value };
      })
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_cost * item.quantity_ordered,
    0
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError(t.supplierRequired);
      return;
    }

    const validItems = items.filter((item) => item.product_id);
    if (validItems.length === 0) {
      setError(t.addAtLeastOne);
      return;
    }

    for (const item of validItems) {
      if (item.quantity_ordered <= 0) {
        setError(t.quantityPositive);
        return;
      }
    }

    startTransition(async () => {
      const result = await createPurchaseOrder({
        supplier_id: supplierId,
        expected_date: expectedDate || undefined,
        notes: notes || undefined,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
        })),
      });

      if (result && "error" in result && result.error) {
        setError(result.error as string);
      } else if (result && "id" in result) {
        toast.success(t.orderCreated);
        router.push(`/purchases/${result.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.orderDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.supplier}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectSupplier} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_date">{t.expectedDate}</Label>
              <Input
                id="expected_date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="notes">{t.notes}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              placeholder={t.notesPlaceholder}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.lineItems}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.addItem}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">{t.product}</TableHead>
                <TableHead className="w-[15%]">{t.quantity}</TableHead>
                <TableHead className="w-[20%]">{t.unitCost}</TableHead>
                <TableHead className="w-[15%] text-right">{t.lineTotal}</TableHead>
                <TableHead className="w-[10%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.key}>
                  <TableCell>
                    <Select
                      value={item.product_id}
                      onValueChange={(val) =>
                        updateItem(item.key, "product_id", val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.selectProduct} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.barcode ? ` (${p.barcode})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity_ordered}
                      onChange={(e) =>
                        updateItem(
                          item.key,
                          "quantity_ordered",
                          parseInt(e.target.value) || 1
                        )
                      }
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) =>
                        updateItem(
                          item.key,
                          "unit_cost",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.unit_cost * item.quantity_ordered)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeLineItem(item.key)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.subtotal}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>{tc.total}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? tc.creating : t.createPurchaseOrder}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/purchases")}
        >
          {tc.cancel}
        </Button>
      </div>
    </form>
  );
}
