"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@tour/ui";

interface TourFiltersProps {
  categories: string[];
  selectedCategory?: string;
  selectedSort?: string;
  totalCount?: number;
}

export function TourFilters({
  categories,
  selectedCategory,
  selectedSort,
  totalCount,
}: TourFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deduplicate near-identical categories (e.g. "Walking Tour" vs "Walking Tours")
  const uniqueCategories = categories.filter((cat, index) => {
    const normalized = cat.toLowerCase().trim().replace(/s$/, "");
    return !categories.some(
      (other, otherIndex) =>
        otherIndex < index &&
        other.toLowerCase().trim().replace(/s$/, "") === normalized
    );
  });

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const activeFilterClass = "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background";

  return (
    <div className="sticky top-[6.9rem] z-30 -mx-4 mb-8 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <p className="hidden shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground sm:block">
            Categories
          </p>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            <Button
              variant="outline"
              className={!selectedCategory ? activeFilterClass : undefined}
              size="sm"
              onClick={() => updateFilter("category", null)}
            >
              All
            </Button>
            {uniqueCategories.map((category) => (
              <Button
                key={category}
                variant="outline"
                className={selectedCategory === category ? activeFilterClass : undefined}
                size="sm"
                onClick={() => updateFilter("category", category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {typeof totalCount === "number" ? (
            <p className="text-xs text-muted-foreground sm:text-sm">{totalCount} experiences</p>
          ) : null}
          <div className="flex items-center gap-2 sm:ml-auto">
            <label htmlFor="tour-sort" className="text-sm text-muted-foreground">
              Sort:
            </label>
            <select
              id="tour-sort"
              value={selectedSort || "newest"}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
