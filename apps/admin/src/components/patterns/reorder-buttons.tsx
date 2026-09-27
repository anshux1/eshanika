"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@eshanika/ui/components/tooltip";
import { ArrowDown, ArrowUp } from "lucide-react";

type ReorderButtonsProps = {
  label: string;
  index: number;
  count: number;
  disabled?: boolean;
  onMove: (offset: -1 | 1) => void;
};

export function ReorderButtons({
  label,
  index,
  count,
  disabled = false,
  onMove,
}: ReorderButtonsProps) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Move ${label} up`}
              disabled={disabled || index <= 0}
              onClick={() => onMove(-1)}
              size="icon-sm"
              variant="ghost"
            />
          }
        >
          <ArrowUp aria-hidden />
        </TooltipTrigger>
        <TooltipContent>Move up</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Move ${label} down`}
              disabled={disabled || index >= count - 1}
              onClick={() => onMove(1)}
              size="icon-sm"
              variant="ghost"
            />
          }
        >
          <ArrowDown aria-hidden />
        </TooltipTrigger>
        <TooltipContent>Move down</TooltipContent>
      </Tooltip>
    </>
  );
}
