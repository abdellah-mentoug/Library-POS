import { requireAdmin } from "@/lib/auth";
import { StoreForm } from "../_components/store-form";

export default async function StoreSettingsPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">Store Settings</h1>
      <StoreForm />
    </div>
  );
}
