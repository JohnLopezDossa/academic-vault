import Link from "next/link";
import { requireRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageHeading, StatusPill } from "../admin/admin-shell";

type CommitteeResource = {
  id: string; title: string; file_name: string; file_extension: string;
  status: string; created_at: string;
  courses: { course_code: string; title: string };
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function CommitteeDashboardPage() {
  const profile = await requireRole(["sub_admin", "admin"], "/committee");
  const canUpload = profile.role === "admin" || profile.can_upload;
  const canReview = profile.role === "admin" || profile.can_review;
  const supabase = await createClient();
  const uploadsQuery = supabase.from("resources").select("id, title, file_name, file_extension, status, created_at, courses!inner(course_code, title)").eq("uploader_id", profile.id).order("created_at", { ascending: false }).limit(6);
  const reviewQuery = canReview
    ? supabase.from("resources").select("id, title, file_name, file_extension, status, created_at, courses!inner(course_code, title)").eq("status", "pending").order("created_at", { ascending: true }).limit(6)
    : Promise.resolve({ data: [], error: null });
  const [uploads, queue] = await Promise.all([uploadsQuery, reviewQuery]);

  return <div className="min-h-screen bg-[#f4f7fd] text-slate-900">
    <header className="border-b border-blue-100 bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-7">
      <Link href="/committee" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-blue-100"><img src="/images/its-logo.png" alt="ITS logo" className="h-full w-full object-contain" /></span><span><span className="block text-lg font-extrabold leading-tight text-blue-950">Academic Vault</span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Committee workspace</span></span></Link>
      <nav aria-label="Committee navigation" className="hidden items-center gap-2 sm:flex"><Link href="/committee" className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900">Dashboard</Link>{canReview && <Link href="/admin/submissions" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-blue-50">Review queue</Link>}{canUpload && <Link href="/upload" className="rounded-full bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-900">Upload resources</Link>}<Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Public site</Link><LogoutButton className="rounded-full px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50" /></nav>
      <details className="relative sm:hidden"><summary className="cursor-pointer list-none rounded-full border border-blue-200 px-4 py-2 text-sm font-bold text-blue-900">Menu <span aria-hidden="true">⌄</span></summary><nav aria-label="Committee mobile navigation" className="absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-2xl border border-blue-100 bg-white p-2 shadow-xl"><Link href="/committee" className="rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50">Dashboard</Link>{canReview && <Link href="/admin/submissions" className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">Review queue</Link>}{canUpload && <Link href="/upload" className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">Upload resources</Link>}<Link href="/" className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">Public site</Link><LogoutButton className="rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50" /></nav></details>
    </div></header>

    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-7 sm:py-9">
      <div role="note" className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"><strong className="font-extrabold">LIVE DATABASE</strong><span className="ml-2">Data is loaded using your signed-in profile and database permissions.</span></div>
      <PageHeading eyebrow="Committee workspace · authenticated profile" title={`Welcome, ${profile.display_name || "Committee member"}`} description="Your recent uploads and assigned review work are loaded from Academic Vault." action={<span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{profile.role.replace("_", "-")} account</span>} />

      {(uploads.error || queue.error) && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">Some committee data could not be loaded. Check your profile permissions and database policies.</p>}
      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <article className="rounded-3xl bg-[#091d50] p-5 text-white shadow-xl shadow-blue-950/10 sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-200">Signed-in profile</p><h2 className="mt-2 text-xl font-bold">{profile.display_name || "Unnamed account"}</h2><p className="mt-1 break-all text-xs text-blue-100/70">{profile.id}</p><div className="mt-5 border-t border-white/15 pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-200">Capabilities</p><ul className="mt-3 flex flex-wrap gap-2">{(profile.role === "admin" ? ["Administrator"] : [profile.can_upload && "Upload resources", profile.can_review && "Review submissions", profile.can_manage_resources && "Manage resources"].filter(Boolean) as string[]).map((permission) => <li key={permission} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">{permission}</li>)}{profile.role !== "admin" && !profile.can_upload && !profile.can_review && !profile.can_manage_resources && <li className="text-sm text-blue-100/70">No staff capabilities are assigned.</li>}</ul></div></article>

        <article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_15px_40px_-32px_rgba(30,64,175,.5)] sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Your uploads · live</p><h2 className="mt-1 text-lg font-bold text-blue-950">Recent contributions</h2></div>{canUpload && <Link href="/upload" className="rounded-full bg-blue-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-900">Upload a batch →</Link>}</div><ul className="mt-4 divide-y divide-slate-100">{(uploads.data ?? []).map((item) => <ResourceListItem key={item.id} item={item as unknown as CommitteeResource} />)}{!uploads.error && !uploads.data?.length && <li className="py-7 text-center text-sm text-slate-500">No resources submitted by this profile yet.</li>}</ul></article>
      </section>

      {canReview && <section className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_15px_40px_-32px_rgba(30,64,175,.5)] sm:p-6"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Assigned capability · live</p><h2 className="mt-1 text-lg font-bold text-blue-950">Pending review queue</h2></div><Link href="/admin/submissions" className="text-sm font-semibold text-blue-700 hover:text-blue-950">Open queue →</Link></div><ul className="mt-4 divide-y divide-slate-100">{(queue.data ?? []).map((item) => <ResourceListItem key={item.id} item={item as unknown as CommitteeResource} />)}{!queue.error && !queue.data?.length && <li className="py-7 text-center text-sm text-slate-500">No submissions are waiting for review.</li>}</ul></section>}

      {!canUpload && !canReview && <section className="mt-5 rounded-3xl border border-dashed border-blue-200 bg-white p-8 text-center"><h2 className="font-bold text-blue-950">No committee capabilities assigned</h2><p className="mt-2 text-sm text-slate-500">Contact an administrator if you need upload or review access.</p></section>}
    </main>
  </div>;
}

function ResourceListItem({ item }: { item: CommitteeResource }) {
  return <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.title} · {item.file_name}</p><p className="mt-1 text-xs text-slate-500">{item.courses.course_code} · {item.courses.title} · {dateLabel(item.created_at)}</p></div><StatusPill status={item.status} /></li>;
}
