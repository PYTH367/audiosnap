"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <main className="grid min-h-screen place-items-center text-sm text-ink-muted">Loading AudioSnap…</main>;
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <section className="glass-panel w-full max-w-md space-y-4 p-8 text-center">
          <h1 className="font-display text-3xl font-bold">AudioSnap</h1>
          <p className="text-sm text-ink-muted">Sign in with GitHub to use AudioSnap and keep your history private.</p>
          <button
            type="button"
            onClick={() => signIn("github")}
            className="w-full rounded-xl bg-cyan px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110"
          >
            Continue with GitHub
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => signOut()}
        className="fixed bottom-4 right-4 z-50 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-xs text-ink-muted hover:text-ink"
      >
        Sign out {session.user?.name ? `· ${session.user.name}` : ""}
      </button>
    </>
  );
}
