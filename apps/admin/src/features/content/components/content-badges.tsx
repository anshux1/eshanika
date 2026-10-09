import type { ContentEntryStatus } from "@eshanika/database/enums";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/patterns/status-badge";

export const PAGE_STATUS: Record<
  ContentEntryStatus,
  { tone: StatusTone; label: string; hint: string }
> = {
  draft: { tone: "neutral", label: "Draft", hint: "Only the team can see it" },
  published: { tone: "success", label: "Published", hint: "Live on the store" },
  private: {
    tone: "info",
    label: "Private",
    hint: "Reachable by link, hidden from search",
  },
  archived: { tone: "muted", label: "Archived", hint: "Gone from the store" },
};

export function PageStatusBadge({ status }: { status: ContentEntryStatus }) {
  const badge = PAGE_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}
