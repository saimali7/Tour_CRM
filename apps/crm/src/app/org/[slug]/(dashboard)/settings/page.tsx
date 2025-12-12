import { getOrgContext } from "@/lib/auth";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;
  const { organization } = await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your organization settings
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Organization Details
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="text-sm text-gray-900">{organization.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Slug</dt>
            <dd className="text-sm text-gray-900">{organization.slug}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="text-sm text-gray-900">{organization.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Timezone</dt>
            <dd className="text-sm text-gray-900">{organization.timezone}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Plan</dt>
            <dd className="text-sm text-gray-900 capitalize">
              {organization.plan}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="text-sm text-gray-900 capitalize">
              {organization.status}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Settings Management
        </h2>
        <p className="text-gray-500">
          Full settings management will be available in a future update.
        </p>
      </div>
    </div>
  );
}
