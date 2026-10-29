"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberAccess, type ManagedRole } from "../actions";

export type ProfileMember = {
  id: string;
  display_name: string;
  role: ManagedRole;
  can_upload: boolean;
  can_review: boolean;
  can_manage_resources: boolean;
  created_at: string;
};

const permissionFields = [
  { key: "can_upload", label: "Upload resources", description: "Submit files and create resource batches." },
  { key: "can_review", label: "Review submissions", description: "Review individual submissions and append audit decisions." },
  { key: "can_manage_resources", label: "Manage resources", description: "Search and manage resources and courses." },
] as const;

export default function MembersClient({ profiles, currentUserId }: { profiles: ProfileMember[]; currentUserId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProfileMember | null>(null);
  const [role, setRole] = useState<ManagedRole>("student");
  const [permissions, setPermissions] = useState({ canUpload: false, canReview: false, canManageResources: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  function open(member: ProfileMember) {
    setEditing(member); setRole(member.role); setError(""); setFeedback("");
    setPermissions({ canUpload: member.can_upload, canReview: member.can_review, canManageResources: member.can_manage_resources });
  }

  function changeRole(nextRole: ManagedRole) {
    setRole(nextRole);
    if (nextRole !== "sub_admin") setPermissions({ canUpload: false, canReview: false, canManageResources: false });
  }

  async function save() {
    if (!editing || busy) return;
    if (role !== "sub_admin" && Object.values(permissions).some(Boolean)) {
      setError("Student and admin accounts cannot have individual sub-admin capability flags."); return;
    }
    if (editing.id === currentUserId && role !== "admin") {
      setError("You cannot remove your own administrator access."); return;
    }
    setBusy(true); setError(""); setFeedback("");
    const result = await updateMemberAccess({ profileId: editing.id, role, ...permissions });
    setBusy(false);
    if (!result.ok) { setError(result.error ?? "The profile could not be updated."); return; }
    setFeedback("Profile role and capabilities were saved to Supabase."); setEditing(null); router.refresh();
  }

  return <>
    {feedback && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</p>}
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-xs text-slate-600"><span className="rounded-full bg-[#091d50] px-3 py-1 font-bold text-white">Admin · full access by role</span><span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-900">Sub-admin · explicit capabilities</span><span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">Student · no staff capabilities</span></div>
    <p className="mb-4 text-sm text-slate-600">{profiles.length} registered {profiles.length === 1 ? "profile" : "profiles"}. Email addresses are not stored in the current public profile schema.</p>
    <section aria-label="Registered profiles" className="grid gap-4 xl:grid-cols-2">
      {profiles.map((member) => {
        const isAdmin = member.role === "admin";
        const access = member.role === "admin" ? ["Full administrator permissions"] : member.role === "student" ? ["No staff permissions"] : permissionFields.filter((field) => member[field.key]).map((field) => field.label);
        return <article key={member.id} className={`rounded-3xl border p-5 shadow-[0_14px_38px_-32px_rgba(30,64,175,.55)] sm:p-6 ${isAdmin ? "border-blue-900 bg-[#091d50] text-white" : "border-blue-100 bg-white"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className={`text-[10px] font-bold uppercase tracking-wide ${isAdmin ? "text-blue-200" : "text-slate-500"}`}>Profile {member.id.slice(0, 8)}</p><h2 className="mt-1 truncate font-bold">{member.display_name || "Unnamed account"}{member.id === currentUserId ? " · You" : ""}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${isAdmin ? "bg-sky-200 text-blue-950" : "bg-blue-50 text-blue-900"}`}>{member.role.replace("_", "-")}</span></div>
          <p className={`mt-2 break-all text-xs ${isAdmin ? "text-blue-100/70" : "text-slate-500"}`}>{member.id}</p>
          <div className={`mt-5 border-t pt-4 ${isAdmin ? "border-white/15" : "border-slate-100"}`}><p className={`text-[10px] font-extrabold uppercase tracking-[.18em] ${isAdmin ? "text-blue-200" : "text-blue-600"}`}>Effective access</p><ul className="mt-3 flex flex-wrap gap-2">{access.map((value) => <li key={value} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isAdmin ? "bg-white/10 text-white" : "bg-blue-50 text-blue-900"}`}>{value}</li>)}</ul></div>
          <button type="button" onClick={() => open(member)} className={`mt-5 rounded-full px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 ${isAdmin ? "border border-white/30 text-white hover:bg-white/10 focus:ring-white/20" : "border border-blue-200 text-blue-800 hover:bg-blue-50 focus:ring-blue-100"}`}>Manage access</button>
        </article>;
      })}
      {!profiles.length && <p className="rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">No profiles are available.</p>}
    </section>

    {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#06163dcc] p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setEditing(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="member-access-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-blue-100 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Existing registered profile</p><h2 id="member-access-title" className="mt-1 text-2xl font-extrabold text-blue-950">Manage access</h2><p className="mt-2 break-all text-sm text-slate-600">{editing.display_name || editing.id} · {editing.id}</p>
        <div className="mt-5"><label htmlFor="member-role" className="block text-xs font-bold text-slate-700">Account role</label><select id="member-role" value={role} onChange={(event) => changeRole(event.target.value as ManagedRole)} disabled={editing.id === currentUserId} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8faff] px-3 py-3 text-sm disabled:opacity-60"><option value="student">Student</option><option value="sub_admin">Sub-admin</option><option value="admin">Admin</option></select>{editing.id === currentUserId && <p className="mt-1 text-xs text-slate-500">Your administrator role is locked here to prevent self-removal.</p>}</div>
        {role === "sub_admin" ? <fieldset className="mt-5 space-y-3"><legend className="text-xs font-bold text-slate-700">Sub-admin capabilities</legend>{permissionFields.map((field) => { const key = field.key === "can_upload" ? "canUpload" : field.key === "can_review" ? "canReview" : "canManageResources"; return <label key={field.key} className="flex gap-3 rounded-2xl border border-slate-100 p-3"><input type="checkbox" checked={permissions[key]} onChange={(event) => setPermissions((current) => ({ ...current, [key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-blue-800" /><span><span className="block text-sm font-semibold text-slate-800">{field.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{field.description}</span></span></label>; })}</fieldset> : <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{role === "admin" ? "Administrator permissions are granted by the role; capability flags will remain off." : "Student accounts have no elevated capabilities."}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-5 flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row"><button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" disabled={busy} onClick={() => void save()} className="rounded-full bg-blue-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">{busy ? "Saving…" : "Save to Supabase"}</button></div>
      </section>
    </div>}
  </>;
}
