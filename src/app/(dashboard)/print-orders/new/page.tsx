import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintOrderForm } from "../_components/print-order-form";

export default async function NewPrintOrderPage() {
  await getAuthUser();

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PrintOrderForm customers={customers ?? []} />
    </div>
  );
}
