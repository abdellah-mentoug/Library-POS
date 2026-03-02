import { getAuthUser } from "@/lib/auth";
import { getCustomer, getCustomerPurchaseHistory } from "@/lib/actions/customers";
import { deleteCustomer } from "@/lib/actions/customers";
import { PurchaseHistory } from "../_components/purchase-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch {
    notFound();
  }

  const { sales, printOrders } = await getCustomerPurchaseHistory(id);
  const isAdmin = user.role === "admin";

  async function handleDelete() {
    "use server";
    await deleteCustomer(id);
    redirect("/customers");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{customer.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/customers/${customer.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          {isAdmin && (
            <form action={handleDelete}>
              <Button variant="destructive" type="submit">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${customer.email}`}
                  className="hover:underline"
                >
                  {customer.email}
                </a>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            {!customer.email && !customer.phone && !customer.address && (
              <p className="text-muted-foreground">
                No contact information provided.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.notes ? (
              <p className="whitespace-pre-wrap">{customer.notes}</p>
            ) : (
              <p className="text-muted-foreground">No notes.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseHistory sales={sales} printOrders={printOrders} />
        </CardContent>
      </Card>
    </div>
  );
}
