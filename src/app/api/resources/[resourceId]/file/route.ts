import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain; charset=utf-8",
};

function response(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}

function disposition(filename: string, inline: boolean) {
  const fallback = filename.replace(/[^\x20-\x7E]|["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
    return response("Resource not found", 404);
  }

  const mode = new URL(request.url).searchParams.get("mode") ?? "download";
  const reviewMode = mode === "review-preview" || mode === "review-download";
  if (!reviewMode && mode !== "preview" && mode !== "download") return response("Invalid file mode", 400);

  const supabase = await createClient();
  if (reviewMode) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return response("Resource not found", 404);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, can_review")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError || !profile || (profile.role !== "admin" && !(profile.role === "sub_admin" && profile.can_review))) {
      return response("Resource not found", 404);
    }
  }

  let resourceQuery = supabase
    .from("resources")
    .select("storage_path, file_name, file_extension, mime_type, status")
    .eq("id", resourceId);
  if (!reviewMode) resourceQuery = resourceQuery.eq("status", "approved");
  const { data: resource, error } = await resourceQuery.maybeSingle();

  // Keep the response identical for absent and non-approved resources.
  if (!resource && !error) return response("Resource not found", 404);
  if (error || !resource) return response("File delivery is temporarily unavailable", 503);

  const extension = resource.file_extension.toLowerCase();
  const mimeType = mimeTypes[extension];
  const inline = mode === "preview" || mode === "review-preview";
  if (!mimeType || (inline && extension !== "pdf")) return response("Resource not found", 404);

  const { data: signed, error: signingError } = await supabase.storage
    .from("academic-resources")
    .createSignedUrl(resource.storage_path, 60);
  if (signingError || !signed?.signedUrl) return response("File delivery is temporarily unavailable", 503);

  try {
    const upstreamHeaders = new Headers();
    const range = request.headers.get("range");
    if (range) upstreamHeaders.set("range", range);
    const upstream = await fetch(signed.signedUrl, { headers: upstreamHeaders, cache: "no-store" });
    if (!upstream.ok || !upstream.body) return response("Resource not found", 404);

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": disposition(resource.file_name, inline),
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    for (const name of ["accept-ranges", "content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return response("File delivery is temporarily unavailable", 503);
  }
}
