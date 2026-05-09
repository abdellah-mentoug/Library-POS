"use client";

import { Plus } from "lucide-react";
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

interface Props {
  category?: Category;
  parentCategories: Category[];
  trigger?: React.ReactNode;
}

export function CategoryForm({
  category,
  parentCategories,
  trigger,
}: Props) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEdit = !!category;
  const [parentId, setParentId] = useState(
    category?.parent_id ?? "none"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const payload = {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || "") || null,
      parent_id: parentId === "none" ? null : parentId,
      sort_order: Number(formData.get("sort_order") || 0),
    };

    const parsed = CategorySchema.safeParse(payload);

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      let result;

      try {
        result = isEdit
          ? await updateCategory(category!.id, parsed.data)
          : await createCategory(parsed.data);

        if (result && typeof result === "object" && "error" in result) {
          setError(result.error);
        } else {
          toast.success(
            isEdit ? t.categoryUpdated : t.categoryCreated
          );
          setOpen(false);
        }
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.newCategory}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t.editCategory : t.newCategory}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={category?.name} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              name="description"
              defaultValue={category?.description || ""}
            />
          </div>

          <div>
            <Label>Parent</Label>

            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none">None</SelectItem>

                {parentCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sort</Label>
            <Input
              name="sort_order"
              type="number"
              defaultValue={category?.sort_order || 0}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button disabled={isPending} className="w-full">
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