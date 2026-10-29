"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";

export function AuthNavigation() {
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
    return <div className="flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm">
      <Link href="/login" className="rounded-full px-2 py-2 text-blue-900 transition hover:bg-blue-50 sm:px-3">Login</Link>
      <Link href="/register" className="rounded-full border border-blue-200 px-3 py-2 text-blue-900 transition hover:bg-blue-50 sm:px-4">Register</Link>
    </div>;
  }

  return <div className="flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm">
    <span className="hidden max-w-40 truncate text-slate-500 lg:block">{user.email}</span>
    <LogoutButton className="rounded-full border border-blue-200 px-3 py-2 text-blue-900 transition hover:bg-blue-50 sm:px-4" />
  </div>;
}
