"use client";

import { useRouter } from "next/navigation";
import ImportPanel from "../components/forms/ImportPanel";

export default function ImportPageClient() {
  const router = useRouter();
  return <ImportPanel onBack={() => router.push("/")} onDone={() => router.push("/")} />;
}
