import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/authorization";

export default async function SubmissionsReviewLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(["admin", "sub_admin"], "/admin/submissions");
  if (profile.role === "sub_admin" && !profile.can_review) {
    redirect("/access-denied?reason=role");
  }
  return children;
}
