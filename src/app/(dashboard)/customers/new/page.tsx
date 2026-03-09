import { getAuthUser } from "@/lib/auth";
import { CustomerForm } from "../_components/customer-form";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function NewCustomerPage() {
  const t = await getTranslations("customers");
  await getAuthUser();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">{t.addCustomer}</h1>
      <CustomerForm mode="create" />
    </div>
  );
}
