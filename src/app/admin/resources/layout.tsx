import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/authorization";

export default async function ResourcesAdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(["admin", "sub_admin"], "/admin/resources");
  if (profile.role === "sub_admin" && !profile.can_manage_resources) {
    redirect("/access-denied?reason=role");
  }
  return children;
}
