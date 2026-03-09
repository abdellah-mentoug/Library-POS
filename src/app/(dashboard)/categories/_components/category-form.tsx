"use client";

import { useState, useTransition } from "react";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import { CategorySchema } from "@/lib/utils/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
}

interface CategoryFormProps {
  category?: Category;
  parentCategories: Category[];
  trigger: React.ReactNode;
}

export function CategoryForm({
  category,
  parentCategories,
  trigger,
}: CategoryFormProps) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEdit = !!category;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      parent_id: formData.get("parent_id") as string | null,
      sort_order: Number(formData.get("sort_order") || 0),
    };

    const parsed = CategorySchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue.path.join(".")}: ${issue.message}`);
      return;
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateCategory(category.id, formData)
        : await createCategory(formData);

      if (result && "error" in result && result.error) {
        setError(result.error as string);
      } else {
        toast.success(isEdit ? t.categoryUpdated : t.categoryCreated);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t.editCategory : t.newCategory}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.name}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={category?.name}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t.description}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={category?.description || ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id">{t.parentCategory}</Label>
            <Select
              name="parent_id"
              defaultValue={category?.parent_id || "none"}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.noneTopLevel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.noneTopLevel}</SelectItem>
                {parentCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">{t.sortOrder}</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={category?.sort_order || 0}
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? tc.saving
              : isEdit
                ? t.updateCategory
                : t.createCategory}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
