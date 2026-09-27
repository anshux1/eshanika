import { auth } from "@eshanika/auth/server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { AcceptInvitation } from "@/features/team/components/accept-invitation";

export const metadata: Metadata = { title: "Invitation | Eshanika Admin" };

export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <AcceptInvitation
      signedInEmail={session?.user.email ?? null}
      token={token}
    />
  );
}
