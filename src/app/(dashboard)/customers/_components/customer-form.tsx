"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { CustomerSchema } from "@/lib/utils/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

interface CustomerFormProps {
  mode: "create" | "edit";
  customer?: Customer;
}

export function CustomerForm({ mode, customer }: CustomerFormProps) {
  const router = useRouter();
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    const parsed = CustomerSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCustomer(formData)
          : await updateCustomer(customer!.id, formData);

      if (result && "error" in result && result.error) {
        setError(result.error as string);
      } else {
        toast.success(
          mode === "create" ? t.customerCreated : t.customerUpdated
        );
        router.push("/customers");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? t.newCustomer : t.editCustomer}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={customer?.name}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={customer?.email || ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t.phone}</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={customer?.phone || ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t.address}</Label>
              <Input
                id="address"
                name="address"
                defaultValue={customer?.address || ""}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t.notes}</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={customer?.notes || ""}
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? tc.saving
                : mode === "create"
                  ? t.createCustomer
                  : t.updateCustomer}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/customers")}
            >
              {tc.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
