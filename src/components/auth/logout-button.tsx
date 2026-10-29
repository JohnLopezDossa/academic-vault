"use client";

import { signOut } from "@/app/auth/actions";

export function LogoutButton({ label = "Sign out", className = "" }: { label?: string; className?: string }) {
  return <form action={signOut}><button type="submit" className={className}>{label}</button></form>;
}
