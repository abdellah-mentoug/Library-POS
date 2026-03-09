import { getAuthUser } from "@/lib/auth";
import { getSales } from "@/lib/actions/sales";
import { getTranslations } from "@/lib/i18n/t-server";
import { SalesTable } from "./_components/sales-table";

export default async function SalesPage() {
  const t = await getTranslations("sales");
  await getAuthUser();
  const sales = await getSales();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <SalesTable sales={sales} />
    </div>
  );
}
