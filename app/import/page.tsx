import ImportPageClient from "./ImportPageClient";
import RateHeader from "../components/RateHeader";
import { terminal as S } from "@/lib/terminal";

export default function ImportPage() {
  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <RateHeader title="Import" />
        <ImportPageClient />
      </div>
    </div>
  );
}
