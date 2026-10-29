import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthFrame } from "@/app/auth/auth-frame";
import { safeReturnPath } from "@/lib/auth/navigation";

const errors: Record<string, string> = {
  validation: "Enter a valid email address and password.",
  credentials: "That email and password combination wasn’t recognized. Check them and try again.",
  confirmation: "That confirmation link is invalid or has expired. Register again or request a new confirmation email.",
  profile: "Your account was confirmed, but its student profile is not available yet. Contact the Academic Vault administrator.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);

  return (
    <AuthFrame eyebrow="Welcome back" title="Sign in to your account" description="Use your student email and password to continue to Academic Vault.">
      {params.error && <p role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">{errors[params.error] ?? "We couldn’t sign you in. Try again."}</p>}
      {params.message === "signed-out" && <p role="status" className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">You have signed out.</p>}
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div><label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" /></div>
        <div><label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" /></div>
        <button type="submit" className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-blue-800 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200">Sign in</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">New to Academic Vault? <Link href={{ pathname: "/register", query: { next } }} className="font-bold text-blue-700 hover:text-blue-950">Create an account</Link></p>
    </AuthFrame>
  );
}
