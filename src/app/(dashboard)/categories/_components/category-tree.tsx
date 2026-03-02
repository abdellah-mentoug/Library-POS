"use client";

import { useState, useTransition } from "react";
import { deleteCategory } from "@/lib/actions/categories";
import { CategoryForm } from "./category-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  FolderOpen,
  Folder,
} from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

interface CategoryTreeProps {
  categories: Category[];
  role: string;
}

export function CategoryTree({ categories, role }: CategoryTreeProps) {
  const isAdmin = role === "admin";
  const parents = categories.filter((c) => !c.parent_id);
  const childrenMap = new Map<string, Category[]>();

  categories.forEach((c) => {
    if (c.parent_id) {
      const children = childrenMap.get(c.parent_id) || [];
      children.push(c);
      childrenMap.set(c.parent_id, children);
    }
  });

  return (
    <div className="space-y-2">
      {parents.map((parent) => (
        <ParentCategory
          key={parent.id}
          category={parent}
          children={childrenMap.get(parent.id) || []}
          parentCategories={parents}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

function ParentCategory({
  category,
  children,
  parentCategories,
  isAdmin,
}: {
  category: Category;
  children: Category[];
  parentCategories: Category[];
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left font-medium"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              <FolderOpen className="h-4 w-4 text-primary" />
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              <Folder className="h-4 w-4 text-muted-foreground" />
            </>
          )}
          {category.name}
          <Badge variant="secondary" className="ml-2">
            {children.length}
          </Badge>
        </button>
        {isAdmin && (
          <CategoryActions
            category={category}
            parentCategories={parentCategories}
          />
        )}
      </div>
      {expanded && children.length > 0 && (
        <div className="border-t bg-muted/30 px-3 py-2">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between rounded-md px-4 py-2 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{child.name}</span>
                {child.description && (
                  <span className="text-xs text-muted-foreground">
                    {child.description}
                  </span>
                )}
              </div>
              {isAdmin && (
                <CategoryActions
                  category={child}
                  parentCategories={parentCategories}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryActions({
  category,
  parentCategories,
}: {
  category: Category;
  parentCategories: Category[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result && "error" in result && result.error) {
        toast.error(result.error as string);
      } else {
        toast.success("Category deleted");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <CategoryForm
        category={category}
        parentCategories={parentCategories.filter((p) => p.id !== category.id)}
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3 w-3" />
          </Button>
        }
      />
      <ConfirmDialog
        title="Delete Category"
        description={`Are you sure you want to delete "${category.name}"? Products in this category will become uncategorized.`}
        onConfirm={handleDelete}
        destructive
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            disabled={isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        }
      />
    </div>
  );
}
