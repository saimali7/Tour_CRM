import type { Metadata } from "next";
import { requireOrganization } from "@/lib/organization";
import { createServices } from "@tour/services";
import { TourCard } from "@/components/tour-card";
import { TourFilters } from "@/components/tour-filters";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Tours & Experiences | ${org.name}`,
    description: `Discover and book amazing tours and experiences with ${org.name}. Browse our selection of unique adventures.`,
    openGraph: {
      title: `Tours & Experiences | ${org.name}`,
      description: `Discover and book amazing tours and experiences with ${org.name}.`,
      type: "website",
    },
  };
}

export default async function ToursPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { category, sort, page: pageParam } = await searchParams;

  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const sortField = sort === "price" ? "basePrice" : "createdAt";
  const sortDirection = sort === "price-desc" ? "desc" : sort === "newest" ? "desc" : "asc";

  const { data: tours, total, totalPages, hasMore } = await services.tour.getAll(
    {
      status: "active",
      isPublic: true,
      category: category || undefined,
    },
    { page, limit: 12 },
    { field: sortField as "basePrice" | "createdAt", direction: sortDirection }
  );

  // Get unique categories for filter
  const categories = await services.tour.getCategories();

  if (tours.length === 0 && page === 1) {
    return (
      <div className="container px-4 py-12">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">No Tours Available</h1>
          <p className="text-muted-foreground">
            Check back soon for upcoming tours and experiences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Tours & Experiences
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Discover unforgettable adventures and create lasting memories with our
          carefully curated selection of tours.
        </p>
      </div>

      {/* Filters */}
      {categories.length > 0 && (
        <TourFilters
          categories={categories}
          selectedCategory={category}
          selectedSort={sort}
        />
      )}

      {/* Tour Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} currency={org.settings?.defaultCurrency || "USD"} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {page > 1 && (
            <a
              href={`?page=${page - 1}${category ? `&category=${category}` : ""}${sort ? `&sort=${sort}` : ""}`}
              className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
            >
              Previous
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {hasMore && (
            <a
              href={`?page=${page + 1}${category ? `&category=${category}` : ""}${sort ? `&sort=${sort}` : ""}`}
              className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
            >
              Next
            </a>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {tours.length} of {total} tours
        </p>
      </div>
    </div>
  );
}
