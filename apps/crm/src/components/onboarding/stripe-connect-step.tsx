"use client";

import { useState } from "react";
import { CreditCard, ArrowRight, Check, Loader2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface StripeConnectStepProps {
  orgSlug: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function StripeConnectStep({
  orgSlug,
  onComplete,
  onSkip,
}: StripeConnectStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOnboarding = trpc.organization.startStripeConnectOnboarding.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      setError(error.message);
      setIsConnecting(false);
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    setError(null);
    startOnboarding.mutate({ orgSlug });
  };

  const benefits = [
    {
      title: "Accept Online Payments",
      description: "Let customers pay securely with credit cards, Apple Pay, and more",
    },
    {
      title: "Automated Invoicing",
      description: "Send payment links and track payment status automatically",
    },
    {
      title: "Fast Payouts",
      description: "Get paid directly to your bank account with fast settlement",
    },
    {
      title: "Built-in Security",
      description: "PCI-compliant payment processing with fraud protection",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Accept Payments
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect with Stripe to accept online payments from your customers
        </p>
      </div>

      {/* Benefits */}
      <div className="grid gap-3">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="flex-shrink-0 mt-0.5">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {benefit.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Stripe Branding */}
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="text-xs text-muted-foreground">Powered by</span>
        <svg
          className="h-6 w-auto"
          viewBox="0 0 60 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M59.64 14.28c0-4.46-2.16-7.99-6.29-7.99-4.15 0-6.65 3.53-6.65 7.96 0 5.25 2.96 7.91 7.21 7.91 2.07 0 3.64-.47 4.82-1.13v-3.5c-1.18.59-2.54.95-4.27.95-1.69 0-3.19-.59-3.38-2.65h8.51c0-.23.05-1.14.05-1.55zm-8.6-1.66c0-1.97 1.2-2.79 2.3-2.79 1.07 0 2.2.82 2.2 2.79h-4.5zm-10.3-6.33c-1.7 0-2.79.8-3.4 1.35l-.22-1.07h-3.82v20.32l4.34-.92.01-4.93c.62.45 1.53 1.09 3.04 1.09 3.07 0 5.87-2.47 5.87-7.91-.01-4.98-2.86-7.93-5.82-7.93zm-1.02 12.2c-1.01 0-1.61-.36-2.02-.81l-.02-6.39c.44-.5 1.06-.84 2.04-.84 1.56 0 2.64 1.75 2.64 4.01 0 2.31-1.06 4.03-2.64 4.03zm-13.37-13.2l4.35-.93V1.14l-4.35.93v3.22zm0 1.29h4.35v15.06h-4.35V6.58zm-4.59 1.27l-.28-1.27h-3.75v15.06h4.34V10.6c1.03-1.34 2.76-1.09 3.3-.9V6.58c-.56-.21-2.61-.59-3.61 1.27zm-8.09-5.07l-4.24.9-.02 13.79c0 2.54 1.91 4.42 4.45 4.42 1.41 0 2.44-.26 3.01-.57v-3.52c-.55.22-3.28 1.01-3.28-1.52V10.16h3.28V6.58h-3.28l.08-3.8zM3.83 11c0-.67.56-1.03 1.48-1.03 1.32 0 2.99.4 4.31 1.11V7.34c-1.45-.58-2.88-.8-4.31-.8C2.13 6.54 0 8.26 0 11.13c0 4.43 6.1 3.72 6.1 5.63 0 .79-.69 1.05-1.64 1.05-1.42 0-3.24-.59-4.68-1.38v3.81c1.6.69 3.21.98 4.68.98 3.25 0 5.48-1.61 5.48-4.52-.01-4.78-6.11-3.93-6.11-5.7z"
            fill="#635BFF"
          />
        </svg>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleConnect}
          disabled={isConnecting || startOnboarding.isPending}
          className="w-full flex items-center justify-center gap-2 bg-[#635BFF] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#5851E0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting || startOnboarding.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Connect with Stripe
              <ExternalLink className="h-3 w-3" />
            </>
          )}
        </button>

        <button
          onClick={onSkip}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Skip for now
        </button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        You can always set this up later in your organization settings.
      </p>
    </div>
  );
}
