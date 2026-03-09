import { getAuthUser } from "@/lib/auth";
import { getProducts } from "@/lib/actions/products";
import { getCategories } from "@/lib/actions/categories";
import { getTranslations } from "@/lib/i18n/t-server";
import { ProductTable } from "./_components/product-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function ProductsPage() {
  const t = await getTranslations("products");
  const user = await getAuthUser();
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        {user.role === "admin" && (
          <Button asChild>
            <Link href="/products/new">
              <Plus className="mr-2 h-4 w-4" />
              {t.addProduct}
            </Link>
          </Button>
        )}
      </div>
      <ProductTable
        products={products}
        categories={categories}
        role={user.role}
      />
    </div>
  );
}
