"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { CustomerSchema } from "@/lib/utils/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  customer?: Customer | null;
  isDialog?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CustomerForm({ customer, isDialog = false, open, onOpenChange }: CustomerFormProps) {
  const router = useRouter();
  const t = useTranslations("customers");
  const tc = useTranslations("common");

  const mode = customer ? "edit" : "create";
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
        if (!isDialog) {
          router.push("/customers");
        }
      }
    });
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
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
          onClick={() => {
            if (!isDialog) {
              router.push("/customers");
            }
          }}
        >
          {tc.cancel}
        </Button>
      </div>
    </form>
  );

  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? t.addCustomer : t.editCustomer}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return formContent;
}