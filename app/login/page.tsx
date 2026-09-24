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
    <div className="t-login-page">
      <section className="t-panel t-login-card">
        <div className="t-login-card__head">
          <span className="t-lbl">Sign in</span>
          <h1 className="t-login-card__title">Logic Finance</h1>
          <p className="t-login-card__sub">Magic link for the owner account. No public sign-up.</p>
        </div>

        <div className="t-login-card__body">
          {sent ? (
            <p className="t-login-sent">
              Link sent to <b>{email}</b>. Open it on this device to continue.
            </p>
          ) : (
            <form className="t-login-form" onSubmit={submit}>
              <label className="t-drawer__field">
                <span className="t-lbl">Email</span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="t-drawer__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              {error ? <div className="t-page__error">{error}</div> : null}
              <button type="submit" className="t-btn t-btn--brand t-login-submit" disabled={busy}>
                {busy ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
