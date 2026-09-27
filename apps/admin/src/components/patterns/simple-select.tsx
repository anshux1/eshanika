"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eshanika/ui/components/select";
import { cn } from "@eshanika/ui/lib/utils";

export type SelectOption<T extends string> = { value: T; label: string };

type SimpleSelectProps<T extends string> = {
  id?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

// A plain single-choice select for fixed lists such as statuses and sort orders.
export function SimpleSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: SimpleSelectProps<T>) {
  return (
    <Select
      disabled={disabled}
      items={options}
      onValueChange={(next) => {
        if (next !== null) onChange(next as T);
      }}
      value={value}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("w-full", className)}
        id={id}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
