import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { TRPCProvider } from "@/providers/trpc-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import "@tour/ui/globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-custom",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-custom",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tour CRM",
  description: "Tour operations management platform",
};

// Check if Clerk is enabled
const ENABLE_CLERK = process.env.ENABLE_CLERK === "true";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${instrumentSans.variable} ${jetBrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AccessibilityProvider>
              <TRPCProvider>{children}</TRPCProvider>
            </AccessibilityProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if Clerk is enabled
  if (ENABLE_CLERK) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
