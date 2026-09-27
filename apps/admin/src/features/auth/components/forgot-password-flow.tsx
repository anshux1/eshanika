"use client";

import { authClient } from "@eshanika/auth/client";
import { Button } from "@eshanika/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { authErrorMessage } from "@/features/auth/error-message";
import { forgotPasswordSchema } from "@/features/auth/schema";
import { AuthCard } from "./auth-card";
import { SubmitButton } from "./submit-button";

const RESEND_COOLDOWN_SECONDS = 30;

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

async function requestReset(email: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: "/reset-password",
  });
}

export function ForgotPasswordFlow() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="flex w-full justify-center"
        exit={{ opacity: 0, x: -16 }}
        initial={{ opacity: 0, x: 16 }}
        key={sentTo ? "sent" : "form"}
        transition={{ duration: 0.2 }}
      >
        {sentTo ? (
          <CheckInbox email={sentTo} onChangeEmail={() => setSentTo(null)} />
        ) : (
          <RequestForm onSent={setSentTo} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function RequestForm({ onSent }: { onSent: (email: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const email = form.watch("email");

  async function onSubmit({ email }: z.infer<typeof forgotPasswordSchema>) {
    setFormError(null);
    const { error } = await requestReset(email);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    onSent(email);
  }

  return (
    <AuthCard
      description="Enter your email address to reset your password."
      footer={
        <>
          Remembered it?{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            href="/sign-in"
          >
            Sign in
          </Link>
        </>
      }
      icon={<KeyRound aria-hidden strokeWidth={1.75} />}
      title="Forgot password?"
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Field data-invalid={!!errors.email || !!formError}>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              aria-invalid={!!errors.email}
              autoComplete="email"
              autoFocus
              className="h-10"
              id="email"
              placeholder="Enter your email"
              type="email"
              {...form.register("email")}
            />
            <FieldError errors={[errors.email]}>{formError}</FieldError>
          </Field>
          {/* Stays muted until there is something to send, like the design. */}
          <SubmitButton disabled={!email} pending={isSubmitting}>
            Send reset link
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

function CheckInbox({
  email,
  onChangeEmail,
}: {
  email: string;
  onChangeEmail: () => void;
}) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setResending(true);
    const { error } = await requestReset(email);
    setResending(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success("Sent another link");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <AuthCard
      description={
        <>
          If an admin account exists for{" "}
          <span className="font-medium text-foreground">
            {maskEmail(email)}
          </span>
          , we sent a reset link. It expires in one hour.
        </>
      }
      icon={<Mail aria-hidden strokeWidth={1.75} />}
      title="Check your inbox"
    >
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-10"
          nativeButton={false}
          render={
            <a
              href="https://mail.google.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              Open Gmail
            </a>
          }
          variant="outline"
        />
        <Button
          className="h-10"
          nativeButton={false}
          render={
            <a
              href="https://outlook.live.com/mail"
              rel="noopener noreferrer"
              target="_blank"
            >
              Open Outlook
            </a>
          }
          variant="outline"
        />
      </div>
      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Button
          disabled={cooldown > 0 || resending}
          onClick={resend}
          variant="ghost"
        >
          <RefreshCw className={resending ? "animate-spin" : undefined} />
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend the email"}
        </Button>
        <p className="text-muted-foreground">
          Wrong address?{" "}
          <button
            className="font-medium text-foreground underline underline-offset-4"
            onClick={onChangeEmail}
            type="button"
          >
            Change it
          </button>
        </p>
      </div>
    </AuthCard>
  );
}
