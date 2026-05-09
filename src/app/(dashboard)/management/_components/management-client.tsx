"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierTable } from "../../suppliers/_components/supplier-table";
import { SupplierForm } from "../../suppliers/_components/supplier-form";
import { CustomerTable } from "../../customers/_components/customer-table";
import { CustomerForm } from "../../customers/_components/customer-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ManagementCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  client_type: string;
  notes: string | null;
  created_at: string;
}

interface ManagementClientProps {
  suppliers: Supplier[];
  customers: ManagementCustomer[];
}

export function ManagementClient({ suppliers, customers }: ManagementClientProps) {
  const t = useTranslations("management");
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<ManagementCustomer | undefined>(undefined);

  function handleAddSupplier() {
    setEditingSupplier(null);
    setSupplierFormOpen(true);
  }

  function handleEditSupplier(supplier: Supplier) {
    setEditingSupplier(supplier);
    setSupplierFormOpen(true);
  }

  function handleSupplierFormClose(open: boolean) {
    setSupplierFormOpen(open);
    if (!open) setEditingSupplier(null);
  }

  function handleAddCustomer() {
    setEditingCustomer(undefined);
    setCustomerFormOpen(true);
  }

  function handleEditCustomer(customer: ManagementCustomer) {
    setEditingCustomer(customer);
    setCustomerFormOpen(true);
  }

  function handleCustomerFormClose(open: boolean) {
    setCustomerFormOpen(open);
    if (!open) setEditingCustomer(undefined);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.title || "Management"}</h1>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers">{t.suppliers || "Suppliers"}</TabsTrigger>
          <TabsTrigger value="customers">{t.customers || "Customers"}</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{t.suppliers || "Suppliers"}</h2>
            <Button onClick={handleAddSupplier}>
              <Plus className="mr-2 h-4 w-4" />
              {t.addSupplier || "Add Supplier"}
            </Button>
          </div>
          <SupplierTable
            suppliers={suppliers}
            onEdit={handleEditSupplier}
          />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{t.customers || "Customers"}</h2>
            <Button onClick={handleAddCustomer}>
              <Plus className="mr-2 h-4 w-4" />
              {t.addCustomer || "Add Customer"}
            </Button>
          </div>
          <CustomerTable
            customers={customers}
            onEdit={handleEditCustomer}
          />
        </TabsContent>
      </Tabs>

      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={handleSupplierFormClose}
        supplier={editingSupplier}
      />

      <Dialog open={customerFormOpen} onOpenChange={handleCustomerFormClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : t.addCustomer || "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm customer={editingCustomer} isDialog={true} />
        </DialogContent>
      </Dialog>
    </>
  );
}