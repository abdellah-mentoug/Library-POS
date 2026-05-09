"use client";

import { useState, useTransition } from "react";
import { createUser, updateProfile } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface User {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_active: boolean;
}

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const mode = user ? "edit" : "create";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState(user?.role || "employee");
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (mode === "create") {
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const fullName = formData.get("full_name") as string;

      if (!email || !password || !fullName) {
        setError(t.allFieldsRequired);
        return;
      }
      if (password.length < 6) {
        setError(t.passwordMinLength);
        return;
      }

      formData.set("role", role);

      startTransition(async () => {
        const result = await createUser(formData);
        if (result && "error" in result && result.error) {
          setError(result.error as string);
        } else {
          toast.success(t.userCreated);
          onOpenChange(false);
        }
      });
    } else {
      const fullName = formData.get("full_name") as string;
      if (!fullName) {
        setError(t.nameRequired);
        return;
      }

      startTransition(async () => {
        const result = await updateProfile(user!.id, {
          full_name: fullName,
          role,
        });
        if (result && "error" in result && result.error) {
          setError(result.error as string);
        } else {
          toast.success(t.userUpdated);
          onOpenChange(false);
        }
      });
    }
  }

  // Reset role when dialog opens with different user
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setRole(user?.role || "employee");
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t.addUser : t.editUser}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "create" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">{t.emailRequired}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.passwordRequired}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                  disabled={isPending}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">{t.fullNameRequired}</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={user?.full_name}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.role}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t.admin}</SelectItem>
                <SelectItem value="employee">{t.employee}</SelectItem>
                <SelectItem value="stock_operator">{t.stockOperator}</SelectItem>
              </SelectContent>
            </Select>
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
                  ? t.createUser
                  : t.saveChanges}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
