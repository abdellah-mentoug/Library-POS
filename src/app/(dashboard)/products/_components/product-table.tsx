"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { ProductFilters } from "./product-filters";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { deleteProduct } from "@/lib/actions/products";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  categories: { name: string } | null;
  category_id: string | null;
  purchase_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  role: string;
}

export function ProductTable({ products, categories, role }: ProductTableProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const filteredProducts = useMemo(() => {
    let result = products;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category_id === categoryFilter);
    }

    if (stockFilter !== "all") {
      result = result.filter((p) => {
        switch (stockFilter) {
          case "in_stock":
            return p.stock_quantity > p.low_stock_threshold;
          case "low_stock":
            return (
              p.stock_quantity > 0 &&
              p.stock_quantity <= p.low_stock_threshold
            );
          case "out_of_stock":
            return p.stock_quantity === 0;
          default:
            return true;
        }
      });
    }

    return result;
  }, [products, search, categoryFilter, stockFilter]);

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tc.name}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "barcode",
      header: t.barcode,
      cell: ({ row }) =>
        row.original.barcode || (
          <span className="text-muted-foreground">{tc.notSet}</span>
        ),
    },
    {
      id: "category",
      header: t.category,
      cell: ({ row }) =>
        row.original.categories?.name || (
          <span className="text-muted-foreground">{t.uncategorized}</span>
        ),
    },
    {
      accessorKey: "purchase_price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="w-full justify-end"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.price}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.purchase_price)}
        </div>
      ),
    },
    {
      accessorKey: "stock_quantity",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="w-full justify-end"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.stock}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const { stock_quantity, low_stock_threshold } = row.original;
        let variant: "default" | "destructive" | "secondary" = "default";
        if (stock_quantity === 0) variant = "destructive";
        else if (stock_quantity <= low_stock_threshold) variant = "secondary";

        return (
          <div className="text-right">
            <Badge variant={variant}>{stock_quantity}</Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/products/${product.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {tc.view}
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/products/${product.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {tc.edit}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      const result = await deleteProduct(product.id);
                      if (result && "error" in result && result.error) {
                        toast.error(result.error as string);
                      } else {
                        toast.success(t.productDeleted);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tc.delete}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <ProductFilters
        categories={categories}
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        stockFilter={stockFilter}
        onStockChange={setStockFilter}
      />
      <DataTable columns={columns} data={filteredProducts} pageSize={20} />
    </div>
  );
}
