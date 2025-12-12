import { serve } from "inngest/next";
import { inngest, inngestFunctions } from "@/inngest";

// Create and export the serve handler for Next.js App Router
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
