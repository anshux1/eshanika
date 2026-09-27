"use client";

import { Button } from "@eshanika/ui/components/button";
import { TimerOff } from "lucide-react";
import Link from "next/link";
import { AuthCard } from "./auth-card";

export function ExpiredLink() {
  return (
    <AuthCard
      description="Reset links work once and expire after one hour. Request a new one to continue."
      footer={
        <Link
          className="font-medium text-foreground underline underline-offset-4"
          href="/sign-in"
        >
          Back to sign in
        </Link>
      }
      icon={<TimerOff aria-hidden strokeWidth={1.75} />}
      title="This link has expired"
    >
      <Button
        className="h-10 w-full"
        nativeButton={false}
        render={<Link href="/forgot-password">Request a new link</Link>}
      />
    </AuthCard>
  );
}
