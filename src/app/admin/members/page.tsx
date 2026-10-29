import { requireRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, PageHeading } from "../admin-shell";
import MembersClient, { type ProfileMember } from "./members-client";

export default async function MembersPage() {
  const current = await requireRole(["admin"], "/admin/members");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, can_upload, can_review, can_manage_resources, created_at")
    .order("created_at", { ascending: false });

  return <AdminShell pageTitle="Committee members">
    <PageHeading eyebrow="Access roster · live profiles" title="Member access" description="Manage roles and explicit sub-admin capabilities for registered profiles. These controls cannot create or deactivate authentication accounts." />
    {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">Profiles could not be loaded. Confirm administrator access and the profiles RLS policy.</p> : <MembersClient profiles={(data ?? []) as ProfileMember[]} currentUserId={current.id} />}
  </AdminShell>;
}
