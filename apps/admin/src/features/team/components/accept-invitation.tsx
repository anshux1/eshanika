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
import { Skeleton } from "@eshanika/ui/components/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Ban,
  CircleCheck,
  Clock,
  Hourglass,
  Link2Off,
  LoaderCircle,
  MailOpen,
  UserRoundX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorCode, errorMessage } from "@/components/patterns/page-state";
import { AuthCard } from "@/features/auth/components/auth-card";
import { PasswordInput } from "@/features/auth/components/password-input";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/schema";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { ROLE_LABELS } from "./role-labels";

const newAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(100),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Use at least ${MIN_PASSWORD_LENGTH} characters`,
      )
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type NewAccount = z.infer<typeof newAccountSchema>;

const CLOSED_STATES = {
  invalid: {
    icon: <Link2Off aria-hidden strokeWidth={1.75} />,
    title: "This link doesn't work",
    description:
      "The invitation link is incomplete or was replaced by a newer one. Ask the owner who invited you to send it again.",
  },
  expired: {
    icon: <Hourglass aria-hidden strokeWidth={1.75} />,
    title: "This invitation has expired",
    description:
      "Invitations work for 7 days. Ask the owner who invited you to resend it.",
  },
  revoked: {
    icon: <Ban aria-hidden strokeWidth={1.75} />,
    title: "This invitation was revoked",
    description:
      "An owner cancelled this invitation. Ask them for a new one if you still need access.",
  },
  used: {
    icon: <CircleCheck aria-hidden strokeWidth={1.75} />,
    title: "This invitation was already used",
    description: "Sign in with the account that accepted it.",
  },
} as const;

function ErrorNotice({ error }: { error: unknown }) {
  const code = errorCode(error);
  const existingAccount =
    code === "CONFLICT" && errorMessage(error).startsWith("An account");
  return (
    <div
      className={
        code === "TOO_MANY_REQUESTS"
          ? "rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
          : "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
      role="alert"
    >
      {code === "TOO_MANY_REQUESTS"
        ? "Too many attempts from this network. Wait a minute, then try again."
        : errorMessage(error)}
      {existingAccount ? (
        <span className="mt-2 flex gap-4 font-medium">
          <Link className="underline underline-offset-4" href="/sign-in">
            Sign in
          </Link>
          <Link
            className="underline underline-offset-4"
            href="/forgot-password"
          >
            Forgot password
          </Link>
        </span>
      ) : null}
    </div>
  );
}

export function AcceptInvitation({
  token,
  signedInEmail,
}: {
  token: string;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const inspection = useQuery({
    ...orpc.team.invitations.inspect.queryOptions({ input: { token } }),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const form = useForm<NewAccount>({
    resolver: zodResolver(newAccountSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });
  const accept = useMutation(
    orpc.team.invitations.accept.mutationOptions({
      onSuccess: (result) => {
        if (result.signInRequired) {
          toast.success("Your account is ready. Sign in to continue.");
          router.replace("/sign-in?next=/");
          return;
        }
        toast.success("Welcome to the team");
        router.replace("/");
        router.refresh();
      },
    }),
  );

  const signInHref = `/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`;

  if (inspection.isPending) {
    return (
      <AuthCard
        description="Checking your invitation."
        icon={<MailOpen aria-hidden strokeWidth={1.75} />}
        title="One moment"
      >
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AuthCard>
    );
  }

  const result = inspection.data;
  // A malformed token fails input validation, which means the same as unknown.
  const closedState = inspection.isError
    ? errorCode(inspection.error) === "BAD_REQUEST"
      ? "invalid"
      : null
    : result && result.status !== "valid"
      ? result.status
      : null;

  if (inspection.isError && !closedState) {
    return (
      <AuthCard
        description="We couldn't check this invitation."
        icon={<Clock aria-hidden strokeWidth={1.75} />}
        title="Try again shortly"
      >
        <ErrorNotice error={inspection.error} />
        <Button
          className="mt-4 h-10 w-full"
          onClick={() => inspection.refetch()}
          variant="outline"
        >
          Try again
        </Button>
      </AuthCard>
    );
  }

  if (closedState) {
    const copy = CLOSED_STATES[closedState];
    return (
      <AuthCard
        description={copy.description}
        icon={copy.icon}
        title={copy.title}
      >
        <Button
          className="h-10 w-full"
          nativeButton={false}
          render={<Link href="/sign-in">Go to sign in</Link>}
          variant="outline"
        />
      </AuthCard>
    );
  }

  if (result?.status !== "valid") return null;

  const summary = (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
      <dt className="text-muted-foreground">Email</dt>
      <dd className="truncate font-medium">{result.email}</dd>
      <dt className="text-muted-foreground">Role</dt>
      <dd className="font-medium">{ROLE_LABELS[result.role]}</dd>
      <dt className="text-muted-foreground">Expires</dt>
      <dd>{formatDateTime(result.expiresAt)}</dd>
    </dl>
  );

  const invitedHeading = {
    icon: <MailOpen aria-hidden strokeWidth={1.75} />,
    title: "You're invited",
    description: "Join the Eshanika admin team.",
  };

  if (
    signedInEmail &&
    signedInEmail.toLowerCase() !== result.email.toLowerCase()
  ) {
    return (
      <AuthCard
        description={
          <>
            You're signed in as{" "}
            <span className="font-medium text-foreground">{signedInEmail}</span>
            , but this invitation is for{" "}
            <span className="font-medium text-foreground">{result.email}</span>.
            Sign out, then open this link again.
          </>
        }
        icon={<UserRoundX aria-hidden strokeWidth={1.75} />}
        title="Wrong account"
      >
        <Button
          className="h-10 w-full"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await authClient.signOut();
            router.refresh();
            setSigningOut(false);
          }}
        >
          {signingOut ? <LoaderCircle className="animate-spin" /> : null}
          Sign out
        </Button>
      </AuthCard>
    );
  }

  if (signedInEmail) {
    return (
      <AuthCard {...invitedHeading}>
        <div className="space-y-5">
          {summary}
          {accept.isError ? <ErrorNotice error={accept.error} /> : null}
          <Button
            className="h-10 w-full"
            disabled={accept.isPending || accept.isSuccess}
            onClick={() => accept.mutate({ token })}
          >
            {accept.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            Accept invitation
          </Button>
        </div>
      </AuthCard>
    );
  }

  const { errors } = form.formState;
  return (
    <AuthCard
      {...invitedHeading}
      description="Create your account to join the Eshanika admin team."
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            href={signInHref}
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(({ name, password }) =>
          accept.mutate({ token, name, password }),
        )}
      >
        <FieldGroup className="gap-5">
          {summary}
          {accept.isError ? <ErrorNotice error={accept.error} /> : null}
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Your name</FieldLabel>
            <Input
              aria-invalid={!!errors.name}
              autoComplete="name"
              className="h-10"
              id="name"
              {...form.register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              aria-invalid={!!errors.password}
              autoComplete="new-password"
              className="h-10"
              id="password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              {...form.register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>
          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <PasswordInput
              aria-invalid={!!errors.confirmPassword}
              autoComplete="new-password"
              className="h-10"
              id="confirm-password"
              {...form.register("confirmPassword")}
            />
            <FieldError errors={[errors.confirmPassword]} />
          </Field>
          <SubmitButton pending={accept.isPending || accept.isSuccess}>
            Create account and join
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
