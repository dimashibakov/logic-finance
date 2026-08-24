import type { StatementRow } from "./generic";
import { parseGenericLines } from "./generic";

/** TODO: calibrate on real RSHB statement PDFs. */
export function parse(text: string): StatementRow[] {
  return parseGenericLines(text, "rshb");
}
