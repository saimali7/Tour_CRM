import { getOrgContext } from "@/lib/auth";
import { Users, Plus } from "lucide-react";
import Link from "next/link";

interface CustomersPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomersPage({ params }: CustomersPageProps) {
  const { slug } = await params;
  await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer database</p>
        </div>
        <Link
          href={`/org/${slug}/customers/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No customers yet
          </h3>
          <p className="mt-2 text-gray-500">
            Customers will appear here when they book tours or are added
            manually.
          </p>
          <Link
            href={`/org/${slug}/customers/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        </div>
      </div>
    </div>
  );
}
