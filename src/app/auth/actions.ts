"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/auth/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function authRedirect(path: string, key: "error" | "message", value: string, next?: string): never {
  const query = new URLSearchParams({ [key]: value });
  if (next) query.set("next", next);
  redirect(`${path}?${query.toString()}`);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signIn(formData: FormData): Promise<void> {
  const email = field(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const next = safeReturnPath(field(formData, "next"));

  if (!validEmail(email) || !password) authRedirect("/login", "error", "validation", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authRedirect("/login", "error", "credentials", next);

  redirect(next);
}

export async function register(formData: FormData): Promise<void> {
  const displayName = field(formData, "display_name");
  const email = field(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirmPassword = typeof formData.get("confirm_password") === "string" ? String(formData.get("confirm_password")) : "";
  const next = safeReturnPath(field(formData, "next"));

  if (!displayName || displayName.length > 120 || !validEmail(email) || password.length < 8 || password !== confirmPassword) {
    authRedirect("/register", "error", "validation", next);
  }

  const requestHeaders = await headers();
  const rawOrigin = process.env.NEXT_PUBLIC_SITE_URL || requestHeaders.get("origin");
  let emailRedirectTo: string;
  try {
    if (!rawOrigin) throw new Error("Missing origin");
    const site = new URL(rawOrigin);
    if (!(["http:", "https:"].includes(site.protocol))) throw new Error("Invalid site protocol");
    const callback = new URL("/auth/callback", site.origin);
    callback.searchParams.set("next", next);
    emailRedirectTo = callback.toString();
  } catch {
    authRedirect("/register", "error", "site-url", next);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      // The database trigger always sets role='student'. Only a display name
      // is supplied here; client metadata never receives role or capability fields.
      data: { display_name: displayName },
    },
  });

  if (error) authRedirect("/register", "error", "signup", next);

  if (data.session && data.user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile || profile.role !== "student") {
      await supabase.auth.signOut({ scope: "local" });
      authRedirect("/register", "error", "profile", next);
    }
    redirect(next);
  }

  authRedirect("/register", "message", "confirm", next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
