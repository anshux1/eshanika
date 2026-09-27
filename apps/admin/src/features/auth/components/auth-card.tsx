"use client";

import { cn } from "@eshanika/ui/lib/utils";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

type AuthCardProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

// Borderless on phones where a card frame wastes the narrow width, framed from sm up.
export function AuthCard({
  icon,
  title,
  description,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full max-w-md sm:rounded-2xl sm:border sm:bg-card sm:p-10 sm:shadow-sm",
          className,
        )}
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="mb-5 flex size-14 items-center justify-center rounded-full border bg-muted [&_svg]:size-6"
            initial={{ scale: 0.8, opacity: 0 }}
            transition={{
              delay: 0.08,
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
          >
            {icon}
          </motion.div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-balance text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {children ? <div className="mt-8">{children}</div> : null}
        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </motion.section>
    </MotionConfig>
  );
}
