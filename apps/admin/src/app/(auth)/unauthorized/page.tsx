import { ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export const metadata: Metadata = { title: "No access | Eshanika Admin" };

export default function UnauthorizedPage() {
  return (
    <AuthCard
      description="You're signed in, but this account isn't an active admin. Sign out and use an admin account, or ask an owner for an invitation."
      icon={<ShieldX aria-hidden strokeWidth={1.75} />}
      title="No admin access"
    >
      <SignOutButton />
    </AuthCard>
  );
}
