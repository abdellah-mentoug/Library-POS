import { requireAdmin } from "@/lib/auth";
import { StoreForm } from "../_components/store-form";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function StoreSettingsPage() {
  await requireAdmin();
  const t = await getTranslations("settings");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">{t.storeSettings}</h1>
      <StoreForm />
    </div>
  );
}
