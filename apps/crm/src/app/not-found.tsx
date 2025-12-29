import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin-slow {
                animation: spin-slow 20s linear infinite;
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-full p-10">
              <Compass className="h-20 w-20 text-primary animate-spin-slow" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-3">
            Lost your way?
          </h1>
          <p className="text-muted-foreground text-center max-w-md mb-8 text-lg">
            The page you're looking for doesn't exist. Let's get you back to familiar territory.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all hover:scale-105"
            >
              <Home className="h-5 w-5" />
              Back to Home
            </Link>
          </div>

          <p className="mt-12 text-sm text-muted-foreground">
            Error 404 — Page not found
          </p>
        </div>
      </body>
    </html>
  );
}
