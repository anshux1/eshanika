import { redirect } from "next/navigation";

// Content has no page of its own; the breadcrumb link lands on the first section.
export default function ContentPage() {
  redirect("/content/pages");
}
