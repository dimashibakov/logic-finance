import type { StatementRow } from "./generic";
import { parseGenericLines } from "./generic";

/** TODO: calibrate on real T-Bank statement PDFs. */
export function parse(text: string): StatementRow[] {
  return parseGenericLines(text, "tbank");
}
