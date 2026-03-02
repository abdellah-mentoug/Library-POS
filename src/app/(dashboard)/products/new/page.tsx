import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/actions/categories";
import { ProductForm } from "../_components/product-form";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
