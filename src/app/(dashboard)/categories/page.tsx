import { getAuthUser } from "@/lib/auth";
import { getCategories } from "@/lib/actions/categories";
import { CategoryForm } from "./_components/category-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
}

export default async function CategoriesPage() {
  const user = await getAuthUser();
  const categories: Category[] = await getCategories();

  const parentCategories = categories.filter(
    (c: Category) => !c.parent_id
  );

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Categories
          </h1>
          <p className="text-muted-foreground mt-2">
            Organize your products with hierarchical categories
          </p>
        </div>

        {user.role === "admin" && (
          <CategoryForm
            parentCategories={parentCategories}
            trigger={
              <Button className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                <Plus className="w-4 h-4 mr-2" />
                New Category
              </Button>
            }
          />
        )}
      </div>

      {/* Categories content will go here */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {parentCategories.map((category) => (
          <div
            key={category.id}
            className="group p-6 rounded-2xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-200 hover:shadow-lg hover:border-border"
          >
            <h3 className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors">
              {category.name}
            </h3>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {category.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}