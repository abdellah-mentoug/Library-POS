"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/store/cart-store";
import { formatCurrency } from "@/lib/utils/format";
import { useTranslations } from "@/lib/i18n/use-translations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import Image from "next/image";


interface Product {
  id: string;
  name: string;
  barcode: string | null;
  purchase_price: number;
  tax_rate: number;
  stock_quantity: number;
  image_url: string | null;
  categories: { name: string }[] | { name: string } | null;
}

export function ProductSearch() {
  const t = useTranslations("pos");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedQuery = useDebounce(query, 300);
  const addItem = useCartStore((s) => s.addItem);

  // Load all products on mount
  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("id, name, barcode, purchase_price, tax_rate, stock_quantity, image_url, categories(name)")
        .eq("is_active", true)
        .order("name");

      if (data) {
        setAllProducts(data);
        setProducts(data);
      }
      setLoading(false);
    }
    loadProducts();
  }, []);

  // Filter client-side on search
  useEffect(() => {
    if (!debouncedQuery) {
      setProducts(allProducts);
      return;
    }
    const q = debouncedQuery.toLowerCase();
    setProducts(
      allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      )
    );
  }, [debouncedQuery, allProducts]);

  function handleAddToCart(product: Product) {
    addItem({
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      unitPrice: product.purchase_price,
      costPrice: product.purchase_price,
      taxRate: product.tax_rate,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <p className="p-4 text-center text-muted-foreground">
            {t.noProductsFound}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className="rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                {product.image_url ? (
                  <div className="relative mb-2 h-20 w-full overflow-hidden rounded-md bg-muted">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="mb-2 flex h-20 w-full items-center justify-center rounded-md bg-muted">
                    <span className="text-2xl text-muted-foreground/40">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="text-sm font-medium line-clamp-2">
                  {product.name}
                </p>
                {product.categories && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {Array.isArray(product.categories)
                      ? product.categories[0]?.name
                      : product.categories.name}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {formatCurrency(product.purchase_price)}
                  </span>
                  <Badge
                    variant={
                      product.stock_quantity === 0
                        ? "destructive"
                        : product.stock_quantity <= 3
                          ? "secondary"
                          : "default"
                    }
                    className="text-xs"
                  >
                    {product.stock_quantity}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
