import { requireAdmin } from "@/lib/auth";
import { getSuppliers } from "@/lib/actions/suppliers";
import { getProducts } from "@/lib/actions/products";
import { POForm } from "../_components/po-form";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function NewPurchasePage() {
  const t = await getTranslations("purchases");
  await requireAdmin();
  const [suppliers, products] = await Promise.all([
    getSuppliers(),
    getProducts(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{t.newPurchaseOrder}</h1>
      <POForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          purchase_price: p.purchase_price,
        }))}
      />
    </div>
  );
}
