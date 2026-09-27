"use client";

import { authClient } from "@eshanika/auth/client";
import { Checkbox } from "@eshanika/ui/components/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorMessage } from "@/features/auth/error-message";
import { signInSchema } from "@/features/auth/schema";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });
  const { errors, isSubmitting, isSubmitSuccessful } = form.formState;

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setFormError(null);
    const { error } = await authClient.signIn.email(values);
    if (error) {
      setFormError(authErrorMessage(error));
      // Keep the form usable after a failed attempt.
      form.reset(values, { keepErrors: true });
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-5">
        <AnimatePresence initial={false}>
          {formError ? (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              <p
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            aria-invalid={!!errors.email}
            autoComplete="email"
            autoFocus
            className="h-10"
            id="email"
            placeholder="me@example.com"
            type="email"
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            aria-invalid={!!errors.password}
            autoComplete="current-password"
            className="h-10"
            id="password"
            placeholder="Password"
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <Controller
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <Field className="w-auto" orientation="horizontal">
                <Checkbox
                  checked={field.value}
                  id="remember-me"
                  onCheckedChange={field.onChange}
                />
                <FieldLabel
                  className="font-normal text-muted-foreground"
                  htmlFor="remember-me"
                >
                  Remember me
                </FieldLabel>
              </Field>
            )}
          />
          <Link
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <SubmitButton pending={isSubmitting || isSubmitSuccessful}>
          Sign in
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
