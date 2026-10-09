import type { ReturnStatus } from "@eshanika/database/enums";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/patterns/status-badge";

export const RETURN_STATUS: Record<
  ReturnStatus,
  { tone: StatusTone; label: string }
> = {
  requested: { tone: "warning", label: "Requested" },
  approved: { tone: "info", label: "Approved" },
  rejected: { tone: "muted", label: "Rejected" },
  received: { tone: "info", label: "Received" },
  completed: { tone: "success", label: "Completed" },
  cancelled: { tone: "muted", label: "Cancelled" },
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const badge = RETURN_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}
