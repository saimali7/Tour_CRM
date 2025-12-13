import Link from "next/link";
import { Button } from "@tour/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold tracking-tight">Page Not Found</h1>
        <p className="text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">Browse All Tours</Link>
        </Button>
      </div>
    </main>
  );
}
