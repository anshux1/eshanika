"use client";

import { Button } from "@eshanika/ui/components/button";
import { Skeleton } from "@eshanika/ui/components/skeleton";
import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";

const ERROR_COPY: Record<string, string> = {
  UNAUTHORIZED: "Your session has ended. Sign in again to continue.",
  FORBIDDEN: "You don't have permission to see this.",
  NOT_FOUND: "This item doesn't exist or was removed.",
  CONFLICT: "Someone else changed this. Reload to see the latest version.",
  TOO_MANY_REQUESTS: "Too many requests. Wait a moment and try again.",
};

// Services send short, safe sentences for these codes, such as the last-owner rule.
const SERVER_MESSAGE_CODES = new Set([
  "BAD_REQUEST",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
]);

// oRPC fills a missing message with the title-cased code, like "Bad Request".
function isDefaultMessage(code: string, message: string) {
  return message.toLowerCase() === code.replaceAll("_", " ").toLowerCase();
}

export function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : undefined;
}

export function errorMessage(error: unknown) {
  const code = errorCode(error);
  const message =
    error instanceof Error && error.message.trim() ? error.message : undefined;
  if (code === "BAD_REQUEST" && message === "Input validation failed") {
    return "Some fields are not valid. Check them and try again.";
  }
  if (
    code &&
    message &&
    SERVER_MESSAGE_CODES.has(code) &&
    !isDefaultMessage(code, message)
  ) {
    return message;
  }
  if (code && ERROR_COPY[code]) return ERROR_COPY[code];
  return "Something went wrong. Try again.";
}

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-2">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <Skeleton className="h-10 w-full" key={index} />
      ))}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <Inbox aria-hidden className="size-8 text-muted-foreground" />
      <h2 className="mt-3 font-medium">{title}</h2>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
};

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      role="alert"
    >
      <CircleAlert aria-hidden className="size-8 text-destructive" />
      <p className="mt-3 max-w-sm text-sm">{errorMessage(error)}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry} variant="outline">
          Try again
        </Button>
      )}
    </div>
  );
}
