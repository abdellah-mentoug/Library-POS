"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recordStockEntry } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";
type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  stock_quantity: number;
  category_name: string | null;
};

export function StockEntryForm({ defaultProductId }: { defaultProductId?: string }) {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productId, setProductId] = useState(defaultProductId ?? "");
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/products-list")
      .then((r) => r.json())
      .then((data: ProductRow[] | { error?: string }) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (defaultProductId && !productId) setProductId(defaultProductId);
  }, [defaultProductId, productId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) {
      toast.error(t.selectProduct);
      return;
    }
    setPending(true);
    const res = await recordStockEntry({
      productId,
      quantity: Number(qty),
      notes: notes || undefined,
    });
    setPending(false);
    if ("error" in res && res.error) toast.error(res.error);
    else {
      toast.success(t.stockEntrySuccess);
      router.push("/stock");
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label>{t.product}</Label>
        <Select
          value={productId}
          onValueChange={setProductId}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder={t.selectProduct} />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.barcode ? ` (${p.barcode})` : ""} — {p.stock_quantity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="qty">{t.quantity}</Label>
        <Input
          id="qty"
          type="number"
          min={1}
          step={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">{t.notes}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || loading}>
          {pending ? tc.processing : tc.confirm}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/stock">{t.backToStock}</Link>
        </Button>
      </div>
    </form>
  );
}
