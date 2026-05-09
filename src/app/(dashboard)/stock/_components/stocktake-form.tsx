"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recordStocktake } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";
import { SearchInput } from "@/components/shared/search-input";

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  stock_quantity: number;
  category_name: string | null;
};

export function StocktakeForm() {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/products-list")
      .then((r) => r.json())
      .then((data: ProductRow[] | { error?: string }) => {
        if (Array.isArray(data)) {
          setProducts(data);
          const init: Record<string, string> = {};
          for (const p of data) init[p.id] = String(p.stock_quantity);
          setCounts(init);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, search]);

  function setCount(id: string, value: string) {
    setCounts((prev) => ({ ...prev, [id]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items = products.map((p) => ({
      productId: p.id,
      countedQuantity: Number(counts[p.id] ?? p.stock_quantity),
    }));
    if (items.some((i) => !Number.isFinite(i.countedQuantity) || i.countedQuantity < 0)) {
      toast.error(tc.somethingWentWrong);
      return;
    }
    setPending(true);
    const res = await recordStocktake({ items, notes: notes || undefined });
    setPending(false);
    if ("error" in res && res.error) toast.error(res.error);
    else if ("success" in res && res.success) {
      const changed =
        "data" in res && res.data && typeof res.data === "object" && "changed" in res.data
          ? (res.data as { changed: number }).changed
          : 0;
      toast.success(interpolate(t.stocktakeSuccess, { count: changed }));
      router.push("/stock");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SearchInput
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={setSearch}
        className="max-w-md"
      />
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.product}</TableHead>
              <TableHead className="text-end">{t.systemQty}</TableHead>
              <TableHead className="w-32 text-end">{t.countedQty}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3}>{tc.loading}</TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const sys = p.stock_quantity;
                const c = Number(counts[p.id] ?? sys);
                const diff = c !== sys;
                return (
                  <TableRow
                    key={p.id}
                    className={diff ? "bg-amber-50 dark:bg-amber-950/30" : undefined}
                  >
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.barcode && (
                        <div className="text-xs text-muted-foreground">{p.barcode}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-end">{sys}</TableCell>
                    <TableCell className="text-end">
                      <Input
                        type="number"
                        min={0}
                        className="w-24 ms-auto"
                        value={counts[p.id] ?? String(sys)}
                        onChange={(e) => setCount(p.id, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-notes">{t.notes}</Label>
        <Textarea
          id="st-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || loading}>
          {pending ? tc.processing : t.confirmInventory}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/stock">{t.backToStock}</Link>
        </Button>
      </div>
    </form>
  );
}
