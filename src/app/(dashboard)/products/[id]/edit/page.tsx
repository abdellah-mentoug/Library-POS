import { requireAdmin } from "@/lib/auth";
import { getProduct } from "@/lib/actions/products";
import { getCategories } from "@/lib/actions/categories";
import { ProductForm } from "../../_components/product-form";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ProductForm mode="edit" product={product} categories={categories} />
    </div>
  );
}
