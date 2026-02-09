"use client";

import { useMemo, useState, useEffect } from "react";
import { formatDistanceToNow, isToday } from "date-fns";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  CheckCheck,
  Archive,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type NotificationItem = {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
  occurredAt: Date;
  readAt: Date | null;
};

export function NotificationCenter() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const inboxQueryInput = useMemo(
    () => ({
      page: 1,
      limit: 25,
      unreadOnly: activeTab === "unread",
    }),
    [activeTab]
  );

  const {
    data: inbox,
    isLoading,
    isFetching,
  } = trpc.notification.list.useQuery(inboxQueryInput, {
    enabled: isMounted,
    refetchInterval: 30000,
  });

  const refreshInbox = async () => {
    await utils.notification.list.invalidate();
  };

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      void refreshInbox();
    },
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      void refreshInbox();
    },
  });

  const archiveMutation = trpc.notification.archive.useMutation({
    onSuccess: () => {
      void refreshInbox();
    },
  });

  const archiveAllReadMutation = trpc.notification.archiveAllRead.useMutation({
    onSuccess: () => {
      void refreshInbox();
    },
  });

  const notifications = useMemo(
    () => (inbox?.data ?? []) as NotificationItem[],
    [inbox?.data]
  );
  const unreadCount = inbox?.unreadCount ?? 0;
  const mutationBusy =
    markReadMutation.isPending ||
    markAllReadMutation.isPending ||
    archiveMutation.isPending ||
    archiveAllReadMutation.isPending;

  const sections = useMemo(() => {
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    for (const notification of notifications) {
      if (isToday(new Date(notification.occurredAt))) {
        today.push(notification);
      } else {
        earlier.push(notification);
      }
    }

    return [
      { label: "Today", items: today },
      { label: "Earlier", items: earlier },
    ].filter((section) => section.items.length > 0);
  }, [notifications]);

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.readAt) {
      markReadMutation.mutate({ ids: [notification.id] });
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl as Route);
      setOpen(false);
    }
  };

  const handleDismiss = (id: string) => {
    archiveMutation.mutate({ ids: [id] });
  };

  const renderSeverityIcon = (severity: NotificationItem["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "info":
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const renderSeverityBadge = (severity: NotificationItem["severity"]) => {
    if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
    if (severity === "warning") return <Badge variant="warning">Warning</Badge>;
    if (severity === "success") return <Badge variant="success">Success</Badge>;
    return <Badge variant="outline">Info</Badge>;
  };

  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[420px] p-0 border-border/70 shadow-xl"
      >
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Inbox</h3>
              {unreadCount > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  {unreadCount} unread
                </Badge>
              )}
              {isFetching && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={unreadCount === 0 || mutationBusy}
                onClick={() => markAllReadMutation.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={mutationBusy}
                onClick={() => archiveAllReadMutation.mutate()}
              >
                <Archive className="h-3.5 w-3.5 mr-1" />
                Clear read
              </Button>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "all" | "unread")}
            className="mt-3"
          >
            <TabsList className="h-8 w-full grid grid-cols-2">
              <TabsTrigger value="all" className="text-xs h-6">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs h-6">
                Unread
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[420px]">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-border/60 p-3 animate-pulse">
                  <div className="h-3 w-2/3 bg-muted rounded" />
                  <div className="mt-2 h-3 w-full bg-muted rounded" />
                  <div className="mt-2 h-3 w-1/3 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="h-11 w-11 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-center">
                <Bell className="h-5 w-5 text-muted-foreground/70" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
                You are up to date. New operational events will appear here.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {sections.map((section) => (
                <section key={section.label}>
                  <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {section.label}
                  </p>
                  <div className="space-y-2">
                    {section.items.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "group relative rounded-xl border border-border/70 bg-card/50 p-3 transition-colors",
                          "hover:border-border hover:bg-muted/30",
                          !notification.readAt && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <button
                          className="w-full text-left"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3 pr-6">
                            <div className="mt-0.5 shrink-0">
                              {renderSeverityIcon(notification.severity)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-foreground leading-tight">
                                  {notification.title}
                                </p>
                                {renderSeverityBadge(notification.severity)}
                              </div>

                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                {notification.body}
                              </p>

                              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>
                                  {formatDistanceToNow(new Date(notification.occurredAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {notification.actionLabel && (
                                  <span className="inline-flex items-center gap-1 text-primary font-medium">
                                    {notification.actionLabel}
                                    <ChevronRight className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        <button
                          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/70 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          aria-label="Dismiss notification"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDismiss(notification.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
