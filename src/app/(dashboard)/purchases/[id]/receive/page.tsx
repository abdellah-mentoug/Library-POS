import { requireAdmin } from "@/lib/auth";
import { getPurchaseOrder } from "@/lib/actions/purchases";
import { ReceiveForm } from "../../_components/receive-form";
import { POStatusBadge } from "../../_components/po-status-badge";
import { formatOrderNumber } from "@/lib/utils/format";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "@/lib/i18n/t-server";
import { interpolate } from "@/lib/i18n/locales";

export default async function ReceiveStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("purchases");
  await requireAdmin();
  const { id } = await params;

  let po;
  try {
    po = await getPurchaseOrder(id);
  } catch {
    notFound();
  }

  // Can only receive on ordered or partially_received POs
  if (po.status !== "ordered" && po.status !== "partially_received") {
    redirect(`/purchases/${id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">
          {interpolate(t.receiveStockHeading, { poNumber: formatOrderNumber(po.po_number) })}
        </h1>
        <POStatusBadge status={po.status} />
      </div>
      <p className="text-muted-foreground">
        {t.supplier}: {po.suppliers?.name || t.unknown}
      </p>
      <ReceiveForm
        poId={po.id}
        items={po.purchase_items as Array<{
          id: string;
          product_id: string;
          quantity_ordered: number;
          quantity_received: number;
          unit_cost: number;
          products: { id: string; name: string; barcode: string | null; stock_quantity: number } | null;
        }>}
      />
    </div>
  );
}
