import { NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/auth/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = safeReturnPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const supabase = await createClient();

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims?.sub) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "student") {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/login?error=profile", url.origin));
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
