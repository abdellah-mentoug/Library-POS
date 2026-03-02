"use client";

import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface ProductFiltersProps {
  categories: Category[];
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  stockFilter: string;
  onStockChange: (value: string) => void;
}

export function ProductFilters({
  categories,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  stockFilter,
  onStockChange,
}: ProductFiltersProps) {
  const hasFilters = search || categoryFilter !== "all" || stockFilter !== "all";

  const parents = categories.filter((c) => !c.parent_id);
  const childrenMap = new Map<string, Category[]>();
  categories.forEach((c) => {
    if (c.parent_id) {
      const children = childrenMap.get(c.parent_id) || [];
      children.push(c);
      childrenMap.set(c.parent_id, children);
    }
  });

  function clearFilters() {
    onSearchChange("");
    onCategoryChange("all");
    onStockChange("all");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        placeholder="Search by name or barcode..."
        value={search}
        onChange={onSearchChange}
        className="w-64"
      />

      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {parents.map((parent) => (
            <div key={parent.id}>
              <SelectItem value={parent.id} className="font-medium">
                {parent.name}
              </SelectItem>
              {(childrenMap.get(parent.id) || []).map((child) => (
                <SelectItem key={child.id} value={child.id} className="pl-6">
                  &nbsp;&nbsp;{child.name}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      <Select value={stockFilter} onValueChange={onStockChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Stock Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stock</SelectItem>
          <SelectItem value="in_stock">In Stock</SelectItem>
          <SelectItem value="low_stock">Low Stock</SelectItem>
          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
