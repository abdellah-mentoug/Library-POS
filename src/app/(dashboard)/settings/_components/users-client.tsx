"use client";

import { useState } from "react";
import { UserTable } from "./user-table";
import { UserForm } from "./user-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";

interface User {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UsersClientProps {
  users: User[];
  currentUserId: string;
}

export function UsersClient({ users, currentUserId }: UsersClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const t = useTranslations("settings");

  function handleAdd() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function handleEdit(user: User) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingUser(null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.userManagement}</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t.addUser}
        </Button>
      </div>
      <UserTable
        users={users}
        currentUserId={currentUserId}
        onEdit={handleEdit}
      />
      <UserForm
        open={formOpen}
        onOpenChange={handleFormClose}
        user={editingUser}
      />
    </>
  );
}
