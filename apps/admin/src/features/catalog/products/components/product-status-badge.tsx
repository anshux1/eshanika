import type { ProductStatus } from "@eshanika/database/enums";
import { StatusBadge } from "@/components/patterns/status-badge";

const BADGES = {
  draft: { tone: "neutral", label: "Draft" },
  active: { tone: "success", label: "Active" },
  archived: { tone: "muted", label: "Archived" },
} as const;

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const badge = BADGES[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}
