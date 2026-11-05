import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["report_status"];
type Priority = Database["public"]["Enums"]["report_priority"];

const statusStyles: Record<Status, string> = {
  Submitted: "bg-secondary text-secondary-foreground",
  Acknowledged: "bg-chart-3/15 text-chart-3",
  Assigned: "bg-primary/10 text-primary",
  "In Progress": "bg-warning/20 text-warning-foreground",
  Completed: "bg-success/20 text-success-foreground",
  Closed: "bg-muted text-muted-foreground",
};

const priorityStyles: Record<Priority, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-secondary text-secondary-foreground",
  High: "bg-warning/20 text-warning-foreground",
  Urgent: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        priorityStyles[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}
