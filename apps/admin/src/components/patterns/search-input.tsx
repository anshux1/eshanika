"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@eshanika/ui/components/input-group";
import { cn } from "@eshanika/ui/lib/utils";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useUrlState } from "@/hooks/use-url-state";

// Writes to the `q` URL parameter a moment after typing stops.
export function SearchInput({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) {
  const url = useUrlState();
  const current = url.get("q") ?? "";
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (value.trim() === current) return;
    const timer = setTimeout(() => url.set({ q: value.trim() }), 300);
    return () => clearTimeout(timer);
  }, [value, current, url]);

  return (
    <InputGroup className={cn("h-9 w-full sm:w-72", className)}>
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={placeholder}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </InputGroup>
  );
}
