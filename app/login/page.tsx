"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    let emailRedirectTo = `${window.location.origin}/auth/callback`;
    if (next?.startsWith("/") && !next.startsWith("//")) {
      emailRedirectTo += `?next=${encodeURIComponent(next)}`;
    }
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="lf-wrap">
      <div className="lf-phone" style={{ paddingTop: 48 }}>
        <div className="lf-eyebrow">Sign in</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 6px" }}>Logic Finance</h1>
        <p className="lf-hint" style={{ marginBottom: 24 }}>
          Magic link for the owner account. No public sign-up.
        </p>

        {sent ? (
          <div className="lf-card lf-card--pad">
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              Link sent to <b>{email}</b>. Open it on this device to continue.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="lf-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="lf-input--mono"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {error && <div className="lf-text-danger" style={{ fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button type="submit" className="lf-btn" disabled={busy} style={{ marginTop: 0 }}>
              {busy ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
