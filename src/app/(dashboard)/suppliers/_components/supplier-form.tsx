"use client";

import { useState, useTransition } from "react";
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";
import { SupplierSchema } from "@/lib/utils/validation";
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

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierForm({ open, onOpenChange, supplier }: SupplierFormProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const mode = supplier ? "edit" : "create";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get("name") as string,
      contact_person: (formData.get("contact_person") as string) || undefined,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    const parsed = SupplierSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSupplier(formData)
          : await updateSupplier(supplier!.id, formData);

      if (result && "error" in result && result.error) {
        setError(result.error as string);
      } else {
        toast.success(
          mode === "create" ? t.supplierCreated : t.supplierUpdated
        );
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t.addSupplier : t.editSupplier}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.name}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={supplier?.name}
              required
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_person">{t.contactPerson}</Label>
              <Input
                id="contact_person"
                name="contact_person"
                defaultValue={supplier?.contact_person || ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t.phone}</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={supplier?.phone || ""}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={supplier?.email || ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t.address}</Label>
            <Input
              id="address"
              name="address"
              defaultValue={supplier?.address || ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t.notes}</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={supplier?.notes || ""}
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? tc.saving
                : mode === "create"
                  ? t.addSupplier
                  : t.updateSupplier}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
