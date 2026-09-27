"use client";

import { authClient } from "@eshanika/auth/client";
import { Button } from "@eshanika/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, LockKeyhole } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorMessage } from "@/features/auth/error-message";
import {
  MIN_PASSWORD_LENGTH,
  resetPasswordSchema,
} from "@/features/auth/schema";
import { AuthCard } from "./auth-card";
import { ExpiredLink } from "./expired-link";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"form" | "done" | "expired">("form");
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ password }: z.infer<typeof resetPasswordSchema>) {
    setFormError(null);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (error?.code === "INVALID_TOKEN") {
      setStatus("expired");
      return;
    }
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setStatus("done");
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="flex w-full justify-center"
        exit={{ opacity: 0, x: -16 }}
        initial={{ opacity: 0, x: 16 }}
        key={status}
        transition={{ duration: 0.2 }}
      >
        {status === "expired" ? <ExpiredLink /> : null}
        {status === "done" ? (
          <AuthCard
            description="Your password is updated and every other session was signed out."
            icon={<CircleCheck aria-hidden strokeWidth={1.75} />}
            title="Password updated"
          >
            <Button
              className="h-10 w-full"
              nativeButton={false}
              render={<Link href="/sign-in">Continue to sign in</Link>}
            />
          </AuthCard>
        ) : null}
        {status === "form" ? (
          <AuthCard
            description="Choose a new password for your admin account."
            footer={
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="/sign-in"
              >
                Back to sign in
              </Link>
            }
            icon={<LockKeyhole aria-hidden strokeWidth={1.75} />}
            title="Set a new password"
          >
            <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup className="gap-5">
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <PasswordInput
                    aria-invalid={!!errors.password}
                    autoComplete="new-password"
                    autoFocus
                    className="h-10"
                    id="password"
                    placeholder="New password"
                    {...form.register("password")}
                  />
                  {errors.password ? (
                    <FieldError errors={[errors.password]} />
                  ) : (
                    <FieldDescription>
                      At least {MIN_PASSWORD_LENGTH} characters.
                    </FieldDescription>
                  )}
                </Field>
                <Field data-invalid={!!errors.confirmPassword || !!formError}>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm password
                  </FieldLabel>
                  <PasswordInput
                    aria-invalid={!!errors.confirmPassword}
                    autoComplete="new-password"
                    className="h-10"
                    id="confirm-password"
                    placeholder="Repeat the password"
                    {...form.register("confirmPassword")}
                  />
                  <FieldError errors={[errors.confirmPassword]}>
                    {formError}
                  </FieldError>
                </Field>
                <SubmitButton pending={isSubmitting}>
                  Update password
                </SubmitButton>
              </FieldGroup>
            </form>
          </AuthCard>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
