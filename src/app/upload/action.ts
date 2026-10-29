
"use server";

import { requireRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

const LEVELS = [
  "level_100",
  "level_200",
  "level_300",
  "level_400",
] as const;

const SEMESTERS = ["semester_1", "semester_2"] as const;

export type CreateCourseInput = {
  course_code: string;
  title: string;
  academic_level: (typeof LEVELS)[number];
  semester: (typeof SEMESTERS)[number];
};

export async function createCourseAction(input: CreateCourseInput) {
  const profile = await requireRole(
    ["admin", "sub_admin"],
    "/upload"
  );

  if (
    profile.role !== "admin" &&
    !(profile.role === "sub_admin" && profile.can_manage_resources)
  ) {
    return {
      ok: false as const,
      error: "You are not authorized to create courses.",
    };
  }

  if (!input || typeof input !== "object") {
    return { ok: false as const, error: "Invalid course details." };
  }

  const course_code = String(input.course_code ?? "").trim();
  const title = String(input.title ?? "").trim();
  const academic_level = input.academic_level;
  const semester = input.semester;

  if (!course_code || course_code.length > 40) {
    return {
      ok: false as const,
      error: "Course code must be between 1 and 40 characters.",
    };
  }

  if (!title || title.length > 200) {
    return {
      ok: false as const,
      error: "Course title must be between 1 and 200 characters.",
    };
  }

  if (!LEVELS.includes(academic_level)) {
    return { ok: false as const, error: "Select a valid academic level." };
  }

  if (!SEMESTERS.includes(semester)) {
    return { ok: false as const, error: "Select a valid semester." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .insert({
      course_code,
      title,
      academic_level,
      semester,
      created_by: profile.id,
    })
    .select("id, course_code, title, academic_level, semester")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false as const,
        error:
          "A course with this code, academic level, and semester already exists.",
      };
    }

    console.error("Course creation failed:", error.message);

    return {
      ok: false as const,
      error: "Could not create the course. Please try again.",
    };
  }

  return { ok: true as const, course: data };
}
