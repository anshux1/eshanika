import type { Metadata } from "next";
import { ErrorScreen } from "@/components/error-screen";

export const metadata: Metadata = { title: "Page not found | Eshanika Admin" };

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      description="The page you're looking for doesn't exist or was moved."
      title="Page not found"
    />
  );
}
