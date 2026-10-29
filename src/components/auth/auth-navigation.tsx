"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";

export function AuthNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setLoaded(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoaded(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!loaded || !user) {
    return <div className="flex items-center gap-2 text-sm font-semibold">
      <Link href="/login" onClick={onNavigate} className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-blue-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">Login</Link>
      <Link href="/register" onClick={onNavigate} className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-200 px-4 py-2 text-blue-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">Register</Link>
    </div>;
  }

  return <div className="flex items-center gap-2 text-sm font-semibold">
    <span className="hidden max-w-40 truncate text-slate-500 lg:block">{user.email}</span>
    <LogoutButton onClick={onNavigate} className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-200 px-4 py-2 text-blue-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" />
  </div>;
}
