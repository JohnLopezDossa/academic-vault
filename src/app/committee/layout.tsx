import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/authorization";

export default async function CommitteeLayout({ children }: { children: ReactNode }) {
  await requireRole(["sub_admin", "admin"], "/committee");
  return children;
}
