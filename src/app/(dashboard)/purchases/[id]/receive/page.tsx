import { requireAdmin } from "@/lib/auth";
import { getPurchaseOrder } from "@/lib/actions/purchases";
import { ReceiveForm } from "../../_components/receive-form";
import { POStatusBadge } from "../../_components/po-status-badge";
import { formatOrderNumber } from "@/lib/utils/format";
import { notFound, redirect } from "next/navigation";

export default async function ReceiveStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          Receive Stock — {formatOrderNumber(po.po_number)}
        </h1>
        <POStatusBadge status={po.status} />
      </div>
      <p className="text-muted-foreground">
        Supplier: {po.suppliers?.name || "Unknown"}
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
