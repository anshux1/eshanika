import { Badge } from "@eshanika/ui/components/badge";
import { cn } from "@eshanika/ui/lib/utils";
import type { ReactNode } from "react";

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive",
  muted: "border-border bg-transparent text-muted-foreground",
};

// Always renders text, so colour is never the only signal.
export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return <Badge className={cn(TONE_CLASSES[tone])}>{children}</Badge>;
}
