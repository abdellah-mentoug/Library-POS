"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { ProductSchema } from "@/lib/utils/validation";
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
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  category_id: string | null;
  purchase_price: number;
  tax_rate: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
}

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  categories: Category[];
}

export function ProductForm({ mode, product, categories }: ProductFormProps) {
  const router = useRouter();
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const parents = categories.filter((c) => !c.parent_id);
  const childrenMap = new Map<string, Category[]>();
  categories.forEach((c) => {
    if (c.parent_id) {
      const children = childrenMap.get(c.parent_id) || [];
      children.push(c);
      childrenMap.set(c.parent_id, children);
    }
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      barcode: (formData.get("barcode") as string) || undefined,
      sku: (formData.get("sku") as string) || undefined,
      category_id: formData.get("category_id") as string | null,
      purchase_price: formData.get("purchase_price") as string,
      tax_rate: formData.get("tax_rate") as string,
      stock_quantity: mode === "create" ? (formData.get("stock_quantity") as string) : "0",
      low_stock_threshold: formData.get("low_stock_threshold") as string,
      unit: formData.get("unit") as string,
    };

    const parsed = ProductSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue.path.join(".")}: ${issue.message}`);
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProduct(formData)
          : await updateProduct(product!.id, formData);

      if (result && "error" in result && result.error) {
        setError(result.error as string);
      } else {
        toast.success(
          mode === "create" ? t.productCreated : t.productUpdated
        );
        router.push("/products");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? t.newProduct : t.editProduct}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={product?.name}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">{t.barcode}</Label>
              <Input
                id="barcode"
                name="barcode"
                maxLength={13}
                defaultValue={product?.barcode || ""}
                disabled={isPending}
                placeholder={t.scanOrEnter}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">{t.sku}</Label>
              <Input
                id="sku"
                name="sku"
                defaultValue={product?.sku || ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">{t.category}</Label>
              <Select
                name="category_id"
                defaultValue={product?.category_id || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noCategory}</SelectItem>
                  {parents.map((parent) => (
                    <div key={parent.id}>
                      <SelectItem value={parent.id} className="font-medium">
                        {parent.name}
                      </SelectItem>
                      {(childrenMap.get(parent.id) || []).map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          &nbsp;&nbsp;{child.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_price">{t.price}</Label>
              <Input
                id="purchase_price"
                name="purchase_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.purchase_price}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_rate">{t.taxRate}</Label>
              <Input
                id="tax_rate"
                name="tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={product?.tax_rate || 0}
                disabled={isPending}
              />
            </div>

            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">{t.initialStock}</Label>
                <Input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  defaultValue={0}
                  disabled={isPending}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">{t.lowStockThreshold}</Label>
              <Input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min="0"
                defaultValue={product?.low_stock_threshold || 3}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">{t.unit}</Label>
              <Select name="unit" defaultValue={product?.unit || "piece"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">{t.piece}</SelectItem>
                  <SelectItem value="pack">{t.pack}</SelectItem>
                  <SelectItem value="box">{t.box}</SelectItem>
                  <SelectItem value="ream">{t.ream}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t.description}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description || ""}
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? tc.saving
                : mode === "create"
                  ? t.createProduct
                  : t.updateProduct}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/products")}
            >
              {tc.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
