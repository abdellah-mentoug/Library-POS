import { getAuthUser } from "@/lib/auth";
import { getCategories } from "@/lib/actions/categories";
import { CategoryTree } from "./_components/category-tree";
import { CategoryForm } from "./_components/category-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function CategoriesPage() {
  const t = await getTranslations("categories");
  const user = await getAuthUser();
  const categories = await getCategories();
  const parentCategories = categories.filter(
    (c: { parent_id: string | null }) => !c.parent_id
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        {user.role === "admin" && (
          <CategoryForm
            parentCategories={parentCategories}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t.addCategory}
              </Button>
            }
          />
        )}
      </div>
      <CategoryTree categories={categories} role={user.role} />
    </div>
  );
}
