"use client";

import { Book, MessageCircle, Mail, Keyboard, Sparkles, Lightbulb, Video, FileText } from "lucide-react";
import { toast } from "sonner";

export default function HelpPage() {
  const handleComingSoon = (feature: string) => {
    toast.info(`${feature} coming soon`, {
      description: "We're working on this. Check back later!",
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground mt-1">
          Everything you need to get the most out of Tour CRM
        </p>
      </div>

      {/* Quick Start Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => {
            // Trigger the keyboard shortcuts modal
            const event = new KeyboardEvent("keydown", { key: "?" });
            document.dispatchEvent(event);
          }}
          className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Keyboard Shortcuts</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">?</kbd> anytime to see all shortcuts
            </p>
          </div>
        </button>

        <button
          onClick={() => handleComingSoon("Video tutorials")}
          className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-white transition-colors">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Video Tutorials</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Step-by-step guides for common tasks
            </p>
            <span className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Coming soon
            </span>
          </div>
        </button>
      </div>

      {/* Getting Started */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            Quick Tips
          </h2>
        </div>
        <div className="divide-y divide-border">
          <div className="px-6 py-4">
            <h3 className="font-medium text-foreground">Creating a booking</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Cmd+B</kbd> anywhere
              to open quick booking, or use the <span className="text-primary">Book</span> button in the header.
            </p>
          </div>
          <div className="px-6 py-4">
            <h3 className="font-medium text-foreground">Finding anything fast</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Cmd+K</kbd> to open
              the command palette and search bookings, customers, tours, and more.
            </p>
          </div>
          <div className="px-6 py-4">
            <h3 className="font-medium text-foreground">Assigning guides</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Go to <span className="text-primary">Calendar</span>, click on any scheduled tour, and use
              the "Assign Guide" action in the details panel.
            </p>
          </div>
          <div className="px-6 py-4">
            <h3 className="font-medium text-foreground">Checking today's schedule</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The <span className="text-primary">Dashboard</span> shows today's tours at a glance.
              For the full view, visit <span className="text-primary">Tour Runs</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Contact & Resources */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => handleComingSoon("Documentation")}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-center group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10 text-info group-hover:bg-info group-hover:text-white transition-colors">
            <Book className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Documentation</h3>
            <p className="text-xs text-muted-foreground mt-1">Full feature guides</p>
          </div>
        </button>

        <a
          href="mailto:support@tourcrm.app"
          className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-center group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10 text-info group-hover:bg-info group-hover:text-white transition-colors">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Email Support</h3>
            <p className="text-xs text-muted-foreground mt-1">support@tourcrm.app</p>
          </div>
        </a>

        <button
          onClick={() => handleComingSoon("Community forum")}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-center group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Community</h3>
            <p className="text-xs text-muted-foreground mt-1">Connect with operators</p>
          </div>
        </button>
      </div>

      {/* Version */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Tour CRM v1.0.0
        </p>
      </div>
    </div>
  );
}
