"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@tour/ui";

interface TourFiltersProps {
  categories: string[];
  selectedCategory?: string;
  selectedSort?: string;
}

export function TourFilters({
  categories,
  selectedCategory,
  selectedSort,
}: TourFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    <div className="flex flex-col sm:flex-row gap-4 mb-8 pb-6 border-b">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className={!selectedCategory ? activeFilterClass : undefined}
          size="sm"
          onClick={() => updateFilter("category", null)}
        >
          All
        </Button>
        {categories.map((category) => (
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

      {/* Sort */}
      <div className="flex items-center gap-2 sm:ml-auto">
        <label htmlFor="tour-sort" className="text-sm text-muted-foreground">
          Sort:
        </label>
        <select
          id="tour-sort"
          value={selectedSort || "newest"}
          onChange={(e) => updateFilter("sort", e.target.value)}
          className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="newest">Newest</option>
          <option value="price">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}
