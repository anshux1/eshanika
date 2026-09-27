import { getActiveAdmin } from "@eshanika/auth/membership";
import { auth } from "@eshanika/auth/server";
import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { toSafeNextPath } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Sign in | Eshanika Admin" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const nextPath = toSafeNextPath(typeof next === "string" ? next : null);

  const session = await auth.api.getSession({ headers: await headers() });
  if (session && (await getActiveAdmin(session.user.id))) {
    redirect(nextPath);
  }

  return (
    <AuthCard
      description="Please enter your details to sign in."
      footer="Admin access is by invitation only."
      icon={<ShoppingCart aria-hidden strokeWidth={1.75} />}
      title="Welcome back"
    >
      <SignInForm next={nextPath} />
    </AuthCard>
  );
}
