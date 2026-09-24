"use client";

import { useMemo, useState, type ReactNode } from "react";

export type TerminalColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: TerminalColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  empty?: string;
};

export default function TerminalTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  defaultSort,
  empty = "No rows",
}: Props<T>) {
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? columns[0]?.key ?? "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSort?.dir ?? "asc");

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, columns, sortKey, sortDir]);

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <table className="t-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{ textAlign: col.align ?? "left" }}
              onClick={() => toggleSort(col.key)}
            >
              {col.label}
              {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ color: "var(--ink3)", cursor: "default" }}>
              {empty}
            </td>
          </tr>
        ) : (
          sorted.map((row) => (
            <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}>
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
