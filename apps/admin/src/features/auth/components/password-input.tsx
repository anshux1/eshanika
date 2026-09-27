"use client";

import { Input } from "@eshanika/ui/components/input";
import { cn } from "@eshanika/ui/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ComponentProps, useState } from "react";

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? Eye : EyeOff;

  return (
    <div className="relative">
      <Input
        className={cn("pr-10", className)}
        type={visible ? "text" : "password"}
        {...props}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        onClick={() => setVisible((value) => !value)}
        type="button"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            initial={{ opacity: 0, scale: 0.6 }}
            key={visible ? "shown" : "hidden"}
            transition={{ duration: 0.12 }}
          >
            <Icon className="size-4" />
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
