
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";



export type ManagedRole = "student" | "sub_admin" | "admin";

export async function updateMemberAccess(input: {
  profileId: string;
  role: ManagedRole;
  canUpload: boolean;
  canReview: boolean;
  canManageResources: boolean;
}) {
  const actor = await requireRole(["admin"], "/admin/members");
  if (!input || !["student", "sub_admin", "admin"].includes(input.role)
      || typeof input.canUpload !== "boolean"
      || typeof input.canReview !== "boolean"
      || typeof input.canManageResources !== "boolean") {
    return { ok: false, error: "Choose a valid role and permission combination." };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.profileId)) {
    return { ok: false, error: "Choose a valid existing profile." };
  }
  if (input.role !== "sub_admin" && (input.canUpload || input.canReview || input.canManageResources)) {
    return { ok: false, error: "Only sub-admin accounts may receive individual capabilities. Admins use their role; students receive none." };
  }
  if (input.profileId === actor.id && input.role !== "admin") {
    return { ok: false, error: "You cannot remove your own administrator access." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role: input.role,
      can_upload: input.role === "sub_admin" && input.canUpload,
      can_review: input.role === "sub_admin" && input.canReview,
      can_manage_resources: input.role === "sub_admin" && input.canManageResources,
    })
    .eq("id", input.profileId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "The profile permissions could not be saved. Check the account and database policies." };
  if (!data) return { ok: false, error: "No profile was updated. It may no longer exist or database policies denied the change." };
  return { ok: true };
}

export async function createCommitteeMember(input: {
  displayName: string;
  email: string;
  password: string;
  role: ManagedRole;
  canUpload: boolean;
  canReview: boolean;
  canManageResources: boolean;
}) {
  await requireRole(["admin"], "/admin/members");

  if (
    !input ||
    typeof input.displayName !== "string" ||
    input.displayName.trim().length < 2 ||
    input.displayName.trim().length > 120 ||
    typeof input.email !== "string" ||
    input.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
    typeof input.password !== "string" ||
    input.password.length < 12 ||
    input.password.length > 128 ||
    !["student", "sub_admin", "admin"].includes(input.role) ||
    typeof input.canUpload !== "boolean" ||
    typeof input.canReview !== "boolean" ||
    typeof input.canManageResources !== "boolean"
  ) {
    return {
      ok: false,
      error: "Enter a valid name and email, a password of at least 12 characters, and valid permissions.",
    };
  }

  if (
    input.role !== "sub_admin" &&
    (input.canUpload || input.canReview || input.canManageResources)
  ) {
    return {
      ok: false,
      error: "Only sub-admin accounts can receive individual capabilities.",
    };
  }

  const admin = createAdminClient();
  let createdUserId: string | null = null;

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: false,
    user_metadata: {
      display_name: input.displayName.trim(),
    },
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: "Account creation failed. Check the email address and Supabase Auth configuration.",
    };
  }

  createdUserId = data.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      role: input.role,
      can_upload: input.role === "sub_admin" && input.canUpload,
      can_review: input.role === "sub_admin" && input.canReview,
      can_manage_resources:
        input.role === "sub_admin" && input.canManageResources,
    })
    .eq("id", createdUserId);

  if (profileError) {
    // Avoid leaving an account behind with an unexpected role.
    const { error: cleanupError } =
      await admin.auth.admin.deleteUser(createdUserId);

    return {
      ok: false,
      error: cleanupError
        ? "Profile setup failed and account cleanup needs administrator attention."
        : "Profile setup failed. The newly created account was rolled back.",
    };
  }

  return {
    ok: true,
    member: {
      id: createdUserId,
      email: data.user.email,
      displayName: input.displayName.trim(),
    },
  };
}

async function requireResourceManager() {
  const profile = await requireRole(["admin", "sub_admin"], "/admin/resources");
  if (profile.role !== "admin" && !profile.can_manage_resources) {
    return { error: "Your account does not have resource-management permission." } as const;
  }
  return { error: null } as const;
}

export async function deleteManagedResource(resourceId: string) {
  const permission = await requireResourceManager();
  if (permission.error) return { ok: false, error: permission.error };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
    return { ok: false, error: "Invalid resource identifier." };
  }

  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("request_resource_deletion", { p_resource_id: resourceId });
  if (error || typeof path !== "string") {
    return { ok: false, error: error?.message.includes("review history")
      ? "This resource has review history. It cannot be deleted because Academic Vault preserves review audits."
      : "The database refused to queue this deletion. No Storage object was removed." };
  }
  return removeQueuedObject(supabase, path);
}

export async function retryQueuedResourceCleanup(storagePath: string) {
  const permission = await requireResourceManager();
  if (permission.error) return { ok: false, error: permission.error };
  if (typeof storagePath !== "string" || storagePath.length > 1024) {
    return { ok: false, error: "Invalid Storage path." };
  }
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("resource_storage_deletions")
    .select("storage_path")
    .eq("storage_path", storagePath)
    .is("completed_at", null)
    .maybeSingle();
  if (error || !request) return { ok: false, error: "No pending cleanup request was found for that object." };
  return removeQueuedObject(supabase, request.storage_path);
}

async function removeQueuedObject(supabase: Awaited<ReturnType<typeof createClient>>, storagePath: string) {
  const { error: storageError } = await supabase.storage.from("academic-resources").remove([storagePath]);
  if (storageError) {
    return { ok: false, queued: true, error: "The database record was removed, but private-file cleanup is still pending. Retry it from the cleanup queue." };
  }
  const { error: completionError } = await supabase.rpc("complete_resource_storage_deletion", { p_storage_path: storagePath });
  if (completionError) {
    return { ok: false, queued: true, error: "The file was removed, but the cleanup receipt could not be finalized. Retry the cleanup entry." };
  }
  return { ok: true, queued: false };
}
