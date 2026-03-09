"use client";

import { useState } from "react";
import { SupplierTable } from "./supplier-table";
import { SupplierForm } from "./supplier-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

interface SuppliersClientProps {
  suppliers: Supplier[];
}

export function SuppliersClient({ suppliers }: SuppliersClientProps) {
  const t = useTranslations("suppliers");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  function handleAdd() {
    setEditingSupplier(null);
    setFormOpen(true);
  }

  function handleEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingSupplier(null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t.addSupplier}
        </Button>
      </div>
      <SupplierTable suppliers={suppliers} onEdit={handleEdit} />
      <SupplierForm
        open={formOpen}
        onOpenChange={handleFormClose}
        supplier={editingSupplier}
      />
    </>
  );
}
