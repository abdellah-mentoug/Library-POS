import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductPerformanceClient } from "./product-performance-client";

export default async function ProductPerformancePage() {
  await getAuthUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_product_performance")
    .select("*")
    .order("total_sold", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Product Performance</h1>
      <ProductPerformanceClient products={data || []} />
    </div>
  );
}
