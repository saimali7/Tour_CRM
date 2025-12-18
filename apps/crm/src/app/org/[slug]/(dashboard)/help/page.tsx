"use client";

import { ExternalLink, Book, MessageCircle, Mail, Keyboard } from "lucide-react";

const helpResources = [
  {
    title: "Documentation",
    description: "Learn how to use every feature of the CRM",
    icon: Book,
    href: "#",
  },
  {
    title: "Contact Support",
    description: "Get help from our support team",
    icon: Mail,
    href: "mailto:support@example.com",
  },
  {
    title: "Community",
    description: "Connect with other tour operators",
    icon: MessageCircle,
    href: "#",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground mt-1">
          Get the help you need to make the most of your CRM
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">Keyboard Shortcuts</h3>
            <p className="text-sm text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">?</kbd> to view all shortcuts
            </p>
          </div>
        </div>

        {helpResources.map((resource) => (
          <a
            key={resource.title}
            href={resource.href}
            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <resource.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {resource.title}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </h3>
              <p className="text-sm text-muted-foreground">
                {resource.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">How do I create a booking?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Cmd+B</kbd> anywhere
              to open the quick booking modal, or click the &quot;Book&quot; button in the header.
            </p>
          </div>
          <div>
            <h3 className="font-medium">How do I assign a guide to a tour?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Go to the Calendar page, click on a schedule, and use the &quot;Assign Guide&quot;
              button in the schedule panel.
            </p>
          </div>
          <div>
            <h3 className="font-medium">How do I view today&apos;s schedule?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The &quot;Today&quot; page shows all tours, guests, and issues for the current day.
              Access it from the main navigation.
            </p>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Tour CRM v1.0.0</p>
        <p className="mt-1">
          Need help? Contact us at{" "}
          <a href="mailto:support@example.com" className="text-primary hover:underline">
            support@example.com
          </a>
        </p>
      </div>
    </div>
  );
}
