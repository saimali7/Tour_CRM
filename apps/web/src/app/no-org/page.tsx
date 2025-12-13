import Link from "next/link";

export default function NoOrgPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🗺️</div>
        <h1 className="text-2xl font-bold tracking-tight">
          Booking Site Not Found
        </h1>
        <p className="text-muted-foreground">
          This booking site doesn&apos;t exist or is no longer available.
        </p>
        <p className="text-sm text-muted-foreground">
          If you&apos;re looking to book a tour, please make sure you have the
          correct URL from your tour operator.
        </p>
        <div className="pt-4">
          <Link
            href="https://tourplatform.com"
            className="text-primary hover:underline text-sm"
          >
            Learn more about Tour Platform →
          </Link>
        </div>
      </div>
    </main>
  );
}
