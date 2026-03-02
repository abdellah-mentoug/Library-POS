import { getAuthUser } from "@/lib/auth";
import { getCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "../../_components/customer-form";
import { notFound } from "next/navigation";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getAuthUser();
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">Edit Customer</h1>
      <CustomerForm mode="edit" customer={customer} />
    </div>
  );
}
