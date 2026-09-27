"use client";

import { Button } from "@eshanika/ui/components/button";
import { ArrowLeft, RotateCw } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";

type ErrorScreenProps = {
  code: string;
  title: string;
  description: string;
  onRetry?: () => void;
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function ErrorScreen({
  code,
  title,
  description,
  onRetry,
}: ErrorScreenProps) {
  return (
    <MotionConfig reducedMotion="user">
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <motion.div
          animate="show"
          className="w-full max-w-md"
          initial="hidden"
          transition={{ staggerChildren: 0.06 }}
        >
          <motion.p
            className="font-mono text-sm font-semibold text-muted-foreground"
            variants={item}
          >
            {code}
          </motion.p>
          <motion.h1
            className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl"
            variants={item}
          >
            {title}
          </motion.h1>
          <motion.p className="mt-3 text-muted-foreground" variants={item}>
            {description}
          </motion.p>
          <motion.div className="mt-8 flex flex-wrap gap-3" variants={item}>
            {onRetry ? (
              <Button className="h-10 px-4" onClick={onRetry}>
                <RotateCw />
                Try again
              </Button>
            ) : null}
            <Button
              className="group h-10 px-4"
              nativeButton={false}
              render={
                <Link href="/">
                  <ArrowLeft className="transition-transform group-hover:-translate-x-0.5" />
                  Go back home
                </Link>
              }
              variant={onRetry ? "outline" : "default"}
            />
          </motion.div>
        </motion.div>
      </main>
    </MotionConfig>
  );
}
