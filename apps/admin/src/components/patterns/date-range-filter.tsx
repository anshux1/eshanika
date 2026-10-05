"use client";

import { Input } from "@eshanika/ui/components/input";
import { useId } from "react";
import { useUrlState } from "@/hooks/use-url-state";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Reads the `from` and `to` days (YYYY-MM-DD, India time) from the URL.
export function useDateRange() {
  const url = useUrlState();
  const fromValue = url.get("from");
  const toValue = url.get("to");
  const from = fromValue && DAY.test(fromValue) ? fromValue : undefined;
  const to = toValue && DAY.test(toValue) ? toValue : undefined;
  return { from, to, reversed: Boolean(from && to && from > to) };
}

export function DateRangeFilter() {
  const url = useUrlState();
  const { from, to, reversed } = useDateRange();
  const id = useId();

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label
            className="text-xs text-muted-foreground"
            htmlFor={`${id}-from`}
          >
            From
          </label>
          <Input
            id={`${id}-from`}
            aria-invalid={reversed}
            max={to}
            onChange={(event) => url.set({ from: event.target.value })}
            type="date"
            value={from ?? ""}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground" htmlFor={`${id}-to`}>
            To
          </label>
          <Input
            id={`${id}-to`}
            aria-invalid={reversed}
            min={from}
            onChange={(event) => url.set({ to: event.target.value })}
            type="date"
            value={to ?? ""}
          />
        </div>
      </div>
      {reversed ? (
        <p className="text-xs text-destructive" role="alert">
          The start date must be on or before the end date.
        </p>
      ) : null}
    </div>
  );
}
