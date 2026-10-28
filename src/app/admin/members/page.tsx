"use client";

import { useState, type FormEvent } from "react";
import { AdminShell, PageHeading, StatusPill } from "../admin-shell";
import { usePrototype } from "../prototype-provider";
import type { Member, Permission } from "../prototype-data";

const limitedPermissions: Permission[] = ["Upload resources", "Review submissions"];

export default function MembersPage() {
  const { members, saveMember, toggleMember } = usePrototype();
  const [editing, setEditing] = useState<Member | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  function openNew() {
    setEditing(null); setName(""); setEmail(""); setPermissions([]); setError(""); setIsOpen(true);
  }

  function openEdit(member: Member) {
    setEditing(member); setName(member.name); setEmail(member.email); setPermissions(member.permissions); setError(""); setIsOpen(true);
  }

  function togglePermission(permission: Permission) {
    setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  }

  function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError("Enter a fictional member name."); return; }
    if (!email.trim().toLowerCase().endsWith("@example.com")) { setError("Use a demonstration email address ending in @example.com."); return; }
    saveMember({ id: editing?.id, name: name.trim(), email: email.trim(), role: "Sub-admin", permissions, status: editing?.status ?? "Active" });
    setFeedback(editing ? "Member details updated in this prototype session only." : "Demo member added for this session only. No account was created.");
    setIsOpen(false);
  }

  return <AdminShell pageTitle="Committee members">
    <PageHeading eyebrow="Access roster · prototype" title="Committee members" description="Manage fictional demonstration roles and permissions. These controls do not create accounts, verify identity, or securely enforce access." action={<button type="button" onClick={openNew} className="inline-flex items-center justify-center rounded-full bg-blue-800 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-900/15 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200">+ Add demo member</button>} />
    {feedback && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</p>}

    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-xs text-slate-600"><span className="rounded-full bg-[#091d50] px-3 py-1 font-bold text-white">Main admin · full prototype permissions</span><span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-900">Sub-admin · limited prototype permissions</span></div>

    <section aria-label="Committee members" className="grid gap-4 xl:grid-cols-2">
      {members.map((member) => {
        const isMainAdmin = member.role === "Main admin";
        return <article key={member.id} className={`rounded-3xl border p-5 shadow-[0_14px_38px_-32px_rgba(30,64,175,.55)] sm:p-6 ${isMainAdmin ? "border-blue-900 bg-[#091d50] text-white" : "border-blue-100 bg-white"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${isMainAdmin ? "bg-white/10 text-blue-100" : "bg-blue-50 text-blue-800"}`} aria-hidden="true">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="min-w-0"><h2 className="truncate font-bold">{member.name}</h2><p className={`mt-0.5 truncate text-sm ${isMainAdmin ? "text-blue-100/70" : "text-slate-500"}`}>{member.email}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${isMainAdmin ? "bg-sky-200 text-blue-950" : "bg-blue-50 text-blue-900"}`}>{member.role}</span><StatusPill status={member.status} /></div></div>
          <div className={`mt-5 border-t pt-4 ${isMainAdmin ? "border-white/15" : "border-slate-100"}`}><p className={`text-[10px] font-extrabold uppercase tracking-[.18em] ${isMainAdmin ? "text-blue-200" : "text-blue-600"}`}>Assigned permissions · prototype</p><ul className="mt-3 flex flex-wrap gap-2">{member.permissions.map((permission) => <li key={permission} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isMainAdmin ? "bg-white/10 text-white" : "bg-blue-50 text-blue-900"}`}>{permission}</li>)}{!member.permissions.length && <li className="text-xs text-slate-500">No permissions assigned</li>}</ul></div>
          <div className={`mt-5 flex flex-wrap gap-2 border-t pt-4 ${isMainAdmin ? "border-white/15" : "border-slate-100"}`}>
            {isMainAdmin ? <p className="text-xs font-semibold text-blue-100/75">Full access is shown for demonstration. The main-admin role is not editable here.</p> : <><button type="button" onClick={() => openEdit(member)} className="rounded-full border border-blue-200 px-4 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100">Edit permissions · prototype</button><button type="button" onClick={() => { toggleMember(member.id); setFeedback(`${member.name} status changed in this prototype session only.`); }} className={`rounded-full border px-4 py-2 text-xs font-bold focus:outline-none focus:ring-4 ${member.status === "Active" ? "border-rose-200 text-rose-800 hover:bg-rose-50 focus:ring-rose-100" : "border-emerald-200 text-emerald-800 hover:bg-emerald-50 focus:ring-emerald-100"}`}>{member.status === "Active" ? "Deactivate · prototype" : "Reactivate · prototype"}</button></>}
          </div>
        </article>;
      })}
      {!members.length && <p className="rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">No demonstration members yet. Add a fictional demo member to get started.</p>}
    </section>

    {isOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#071b52]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="member-form-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-blue-100 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Prototype only</p><h2 id="member-form-title" className="mt-1 text-xl font-bold text-blue-950">{editing ? "Edit demo member" : "Add demo member"}</h2><p className="mt-2 text-sm leading-5 text-slate-500">This form updates the demonstration roster only. It does not create a real account.</p></div><button type="button" aria-label="Close form" onClick={() => setIsOpen(false)} className="rounded-full border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50">×</button></div>
        <form onSubmit={submitMember} className="mt-5 space-y-4"><div><label htmlFor="member-name" className="text-sm font-semibold text-slate-700">Fictional display name</label><input id="member-name" value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Morgan Sample" className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></div><div><label htmlFor="member-email" className="text-sm font-semibold text-slate-700">Demo email</label><input id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="member@example.com" className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /><p className="mt-1 text-xs text-slate-500">Use an address ending in @example.com.</p></div>
          <fieldset><legend className="text-sm font-semibold text-slate-700">Sub-admin permissions</legend><p className="mb-2 mt-1 text-xs text-slate-500">Grant only the capabilities you want to demonstrate.</p><div className="grid gap-2 sm:grid-cols-2">{limitedPermissions.map((permission) => <label key={permission} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 hover:bg-blue-50"><input type="checkbox" checked={permissions.includes(permission)} onChange={() => togglePermission(permission)} className="h-4 w-4 rounded border-slate-300 accent-blue-700" />{permission}</label>)}</div></fieldset>
          {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}<div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row"><button type="button" onClick={() => setIsOpen(false)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-full bg-blue-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100">{editing ? "Save demo changes" : "Add demo member"}</button></div>
        </form>
      </section>
    </div>}
  </AdminShell>;
}
