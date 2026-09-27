import type { Metadata } from "next";
import { ForgotPasswordFlow } from "@/features/auth/components/forgot-password-flow";

export const metadata: Metadata = { title: "Forgot password | Eshanika Admin" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}
