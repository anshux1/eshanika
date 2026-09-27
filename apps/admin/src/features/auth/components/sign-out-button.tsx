"use client";

import { authClient } from "@eshanika/auth/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitButton } from "./submit-button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void signOut();
      }}
    >
      <SubmitButton pending={pending}>Sign out</SubmitButton>
    </form>
  );
}
