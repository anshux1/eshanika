"use client";

import { Tabs, TabsList, TabsTrigger } from "@eshanika/ui/components/tabs";
import { useUrlState } from "@/hooks/use-url-state";

type FilterTabsProps = {
  param: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

// The first option is the default and is left out of the URL.
export function FilterTabs({ param, label, options }: FilterTabsProps) {
  const url = useUrlState();
  const fallback = options[0]?.value ?? "";
  const value = url.get(param) ?? fallback;

  return (
    <Tabs
      onValueChange={(next) =>
        url.set({ [param]: next === fallback ? null : String(next) })
      }
      value={value}
    >
      <TabsList aria-label={label}>
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
