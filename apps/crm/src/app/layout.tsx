import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/providers/trpc-provider";
import "@tour/ui/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tour CRM",
  description: "Tour operations management platform",
};

// Check if Clerk is enabled
const ENABLE_CLERK = process.env.ENABLE_CLERK === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if Clerk is enabled
  if (ENABLE_CLERK) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
