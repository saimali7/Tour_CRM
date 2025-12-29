"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useParams } from "next/navigation";
import {
  Target,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { GoalModal } from "@/components/goals/goal-modal";
import { cn } from "@/lib/utils";
import type { Goal } from "@tour/database";

const METRIC_LABELS = {
  revenue: "Revenue",
  bookings: "Bookings",
  capacity_utilization: "Capacity Utilization",
  new_customers: "New Customers",
} as const;

const METRIC_FORMATTERS = {
  revenue: (v: string) => `$${parseFloat(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  bookings: (v: string) => parseInt(v).toLocaleString(),
  capacity_utilization: (v: string) => `${parseFloat(v).toFixed(1)}%`,
  new_customers: (v: string) => parseInt(v).toLocaleString(),
} as const;

const PERIOD_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
} as const;

const STATUS_CONFIG = {
  active: {
    label: "Active",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  missed: {
    label: "Missed",
    icon: XCircle,
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
} as const;

type GoalStatus = keyof typeof STATUS_CONFIG;

export default function GoalsSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const { confirm, ConfirmModal } = useConfirmModal();

  const utils = trpc.useUtils();

  const { data: goals, isLoading } = trpc.goal.list.useQuery({
    filters: statusFilter !== "all" ? { status: statusFilter } : undefined,
  });

  const { data: activeGoals } = trpc.goal.getActive.useQuery();

  const { data: summary } = trpc.goal.getSummary.useQuery();

  const deleteMutation = trpc.goal.delete.useMutation({
    onSuccess: () => {
      utils.goal.list.invalidate();
      utils.goal.getActive.invalidate();
      utils.goal.getSummary.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete goal");
    },
  });

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleDelete = async (goal: Goal) => {
    const confirmed = await confirm({
      title: "Delete Goal",
      description: `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
      confirmLabel: "Delete Goal",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id: goal.id });
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingGoal(null);
  };

  // Get progress data for active goals
  const getGoalProgress = (goalId: string) => {
    return activeGoals?.find((g) => g.id === goalId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/settings` as Route}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-6 w-6 text-emerald-600" />
              Goals
            </h1>
            <p className="text-muted-foreground mt-1">
              Set and track business targets
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingGoal(null);
            setShowModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Active</p>
            <p className="text-2xl font-bold text-foreground">{summary.totalActive}</p>
          </div>
          <div className="bg-card rounded-lg border border-emerald-500/20 p-4">
            <p className="text-sm text-emerald-600">On Track</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.onTrack}</p>
          </div>
          <div className="bg-card rounded-lg border border-orange-500/20 p-4">
            <p className="text-sm text-orange-600">Needs Attention</p>
            <p className="text-2xl font-bold text-orange-600">{summary.offTrack}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground">{summary.completed}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Missed</p>
            <p className="text-2xl font-bold text-foreground">{summary.missed}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          {(["all", "active", "completed", "missed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "py-3 px-1 border-b-2 font-medium text-sm transition-colors",
                statusFilter === status
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {status === "all" ? "All Goals" : STATUS_CONFIG[status].label}
            </button>
          ))}
        </nav>
      </div>

      {/* Goals List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal.id);
            const formatter = METRIC_FORMATTERS[goal.metricType as keyof typeof METRIC_FORMATTERS];
            const statusConfig = STATUS_CONFIG[goal.status as GoalStatus];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={goal.id}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {goal.name}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                          statusConfig.className
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                      {progress && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            progress.isOnTrack
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-orange-500/10 text-orange-600"
                          )}
                        >
                          {progress.isOnTrack ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              On Track
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              Behind
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {goal.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {METRIC_LABELS[goal.metricType as keyof typeof METRIC_LABELS]}
                      </span>
                      <span>
                        Target: {formatter(goal.targetValue)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {PERIOD_LABELS[goal.periodType as keyof typeof PERIOD_LABELS]}
                      </span>
                      <span>
                        {new Date(goal.periodStart).toLocaleDateString()} -{" "}
                        {new Date(goal.periodEnd).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress Bar for Active Goals */}
                    {progress && goal.status === "active" && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Current: {formatter(progress.currentValue || "0")}
                          </span>
                          <span className="text-muted-foreground">
                            {progress.daysRemaining} days remaining
                          </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              progress.isOnTrack ? "bg-emerald-500" : "bg-orange-500"
                            )}
                            style={{ width: `${Math.min(100, progress.progress)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{progress.progress.toFixed(1)}% complete</span>
                          <span>
                            Projected: {formatter(progress.projectedValue)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(goal)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(goal)}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 p-0 hover:text-destructive"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {statusFilter === "all" ? "No goals yet" : `No ${statusFilter} goals`}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {statusFilter === "all"
              ? "Set business goals to track your progress and stay on target. Goals help you measure success and identify areas for improvement."
              : `You don't have any ${statusFilter} goals at the moment.`}
          </p>
          {statusFilter === "all" && (
            <Button
              onClick={() => {
                setEditingGoal(null);
                setShowModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          )}
        </div>
      )}

      {/* Tips Section */}
      {goals && goals.length > 0 && (
        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-emerald-600 mb-1">Goal Tips</h4>
              <ul className="text-sm text-emerald-600/80 space-y-1">
                <li>• Goals are automatically calculated based on actual bookings and revenue</li>
                <li>• Active goals are checked and updated whenever you view this page</li>
                <li>• Goals past their end date are automatically marked as completed or missed</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        open={showModal}
        onOpenChange={handleModalClose}
        goal={editingGoal}
      />

      {ConfirmModal}
    </div>
  );
}
