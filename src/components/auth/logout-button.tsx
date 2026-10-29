"use client";

import { signOut } from "@/app/auth/actions";

export function LogoutButton({ label = "Sign out", className = "", onClick }: { label?: string; className?: string; onClick?: () => void }) {
  return <form action={signOut}><button type="submit" onClick={onClick} className={className}>{label}</button></form>;
}
