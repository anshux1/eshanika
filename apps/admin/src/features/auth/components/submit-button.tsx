"use client";

import { Button } from "@eshanika/ui/components/button";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function SubmitButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      className="h-10 w-full"
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
