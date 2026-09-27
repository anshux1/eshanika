import type { Metadata } from "next";
import { ExpiredLink } from "@/features/auth/components/expired-link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password | Eshanika Admin" };

// Better Auth lands here with ?token=... or ?error=INVALID_TOKEN after checking the email link.
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  if (error || typeof token !== "string" || !token) {
    return <ExpiredLink />;
  }
  return <ResetPasswordForm token={token} />;
}
