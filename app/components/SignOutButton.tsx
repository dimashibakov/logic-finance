"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Props = { compact?: boolean };

export default function SignOutButton({ compact }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={compact ? "lf-sign-out" : "lf-seg__btn"}
      onClick={signOut}
      style={compact ? undefined : { flex: "0 0 auto", minWidth: 72 }}
    >
      {compact ? "Sign out" : "Sign out"}
    </button>
  );
}
