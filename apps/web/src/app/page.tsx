import { Button } from "@tour/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Book Your Next Adventure
        </h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Discover and book amazing tours and experiences
        </p>
        <Button size="lg">Explore Tours</Button>
      </div>
    </main>
  );
}
