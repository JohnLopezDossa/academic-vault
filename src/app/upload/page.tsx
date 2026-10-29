import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "./upload-form";

export default async function UploadPage() {
  const profile = await requireRole(["student", "sub_admin", "admin"], "/upload");

  // Sub-admins may upload only when this capability is explicitly granted.
  if (profile.role === "sub_admin" && !profile.can_upload) {
    redirect("/access-denied?reason=role");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_code, title, academic_level, semester")
    .order("course_code", { ascending: true });

  return <UploadForm courses={(data ?? []) as Parameters<typeof UploadForm>[0]["courses"]} courseLoadError={error ? "The course list could not be loaded. Try again later." : ""} />;
}
