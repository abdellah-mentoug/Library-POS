"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { deleteCustomer } from "@/lib/actions/customers";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  client_type: string;
  notes: string | null;
  created_at: string;
}

interface CustomerTableProps {
  customers: Customer[];
  role?: string;
  onEdit?: (customer: Customer) => void;
}

export function CustomerTable({ customers, role, onEdit }: CustomerTableProps) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, search]);

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: tc.name,
      cell: ({ row }) => (
        <Link
          href={`/customers/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: tc.email,
      cell: ({ row }) =>
        row.original.email || (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "phone",
      header: tc.phone,
      cell: ({ row }) =>
        row.original.phone || (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "address",
      header: tc.address,
      cell: ({ row }) =>
        row.original.address ? (
          <span className="line-clamp-1 max-w-[200px]">
            {row.original.address}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/customers/${customer.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {tc.view}
                </Link>
              </DropdownMenuItem>
              {onEdit ? (
                <DropdownMenuItem onClick={() => onEdit(customer)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {tc.edit}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href={`/customers/${customer.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {tc.edit}
                  </Link>
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    const result = await deleteCustomer(customer.id);
                    if (result && "error" in result && result.error) {
                      toast.error(result.error as string);
                    } else {
                      toast.success(t.customerDeleted);
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tc.delete}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <DataTable columns={columns} data={filtered} pageSize={20} />
    </div>
  );
}
