import ImportPageClient from "./ImportPageClient";
import RateHeader from "../components/RateHeader";

export default function ImportPage() {
  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader title="Import" />
        <ImportPageClient />
      </div>
    </div>
  );
}
