import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/authorization";

export default async function MembersAdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin"], "/admin/members");
  return children;
}
