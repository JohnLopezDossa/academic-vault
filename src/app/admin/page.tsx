import { requireRole } from "@/lib/auth/authorization";
import AdminOverviewContent from "./overview-content";

export default async function AdminOverviewPage() {
  await requireRole(["admin"], "/admin");
  return <AdminOverviewContent />;
}
