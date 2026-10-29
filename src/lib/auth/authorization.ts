import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "student" | "sub_admin" | "admin";

export type AuthenticatedProfile = {
  id: string;
  display_name: string;
  role: ProfileRole;
  can_upload: boolean;
  can_review: boolean;
  can_manage_resources: boolean;
};

export async function requireRole(allowedRoles: readonly ProfileRole[], returnTo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role, can_upload, can_review, can_manage_resources")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/access-denied?reason=profile");
  }

  if (!allowedRoles.includes(profile.role as ProfileRole)) {
    redirect("/access-denied?reason=role");
  }

  return profile as AuthenticatedProfile;
}
