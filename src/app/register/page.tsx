import Link from "next/link";
import { register } from "@/app/auth/actions";
import { AuthFrame } from "@/app/auth/auth-frame";
import { safeReturnPath } from "@/lib/auth/navigation";

const errors: Record<string, string> = {
  validation: "Enter your name, a valid email, and matching passwords of at least 8 characters.",
  signup: "We couldn’t create your account. Check your details and try again. If the address is already registered, sign in instead.",
  profile: "Your account was created, but its student profile could not be verified. Contact the Academic Vault administrator before continuing.",
  "site-url": "The site address is not available for email confirmation. Please try again from the Academic Vault website.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);

  return (
    <AuthFrame eyebrow="Student registration" title="Create your account" description="Register with your email to access Academic Vault. New accounts receive the student role automatically." compact>
      {params.error && <p role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">{errors[params.error] ?? "We couldn’t complete registration. Try again."}</p>}
      {params.message === "confirm" ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950"><p className="font-bold">Check your email to confirm your account.</p><p className="mt-1">After confirmation, you’ll return to Academic Vault and your student profile will be checked.</p></div>
      ) : (
        <form action={register} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <div><label htmlFor="display_name" className="mb-1 block text-sm font-semibold text-slate-700">Your name</label><input id="display_name" name="display_name" type="text" autoComplete="name" required maxLength={120} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" /></div>
          <div><label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" /></div>
          <div><label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-700">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" /><p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p></div>
          <div><label htmlFor="confirm_password" className="mb-1 block text-sm font-semibold text-slate-700">Confirm password</label><input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required minLength={8} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" /></div>
          <button type="submit" className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-blue-800 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200">Create student account</button>
        </form>
      )}
      {params.message === "confirm" ? <p className="mt-4 text-center text-sm text-slate-600"><Link href={{ pathname: "/login", query: { next } }} className="font-bold text-blue-700 hover:text-blue-950">Go to sign in</Link></p> : <p className="mt-4 text-center text-sm text-slate-600">Already registered? <Link href={{ pathname: "/login", query: { next } }} className="font-bold text-blue-700 hover:text-blue-950">Sign in</Link></p>}
    </AuthFrame>
  );
}
