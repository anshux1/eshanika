"use client";

import { Button } from "@eshanika/ui/components/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      <Printer aria-hidden />
      Print
    </Button>
  );
}
