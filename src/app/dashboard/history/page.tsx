"use client";

import { useEffect, useMemo, useState } from "react";
import DashTopbar from "@/components/dashboard/DashTopbar";
import type { FileGroup } from "@/types";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const [groups, setGroups] = useState<FileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/files?group=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setGroups(j.groups);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) => g.reference.toLowerCase().includes(q) || g.originalName.toLowerCase().includes(q)
    );
  }, [groups, search]);

  return (
    <>
      <DashTopbar title="History" subtitle="Tous vos imports CSV, regroupés par référence." />

      <div className="panel">
        <div className="toolbar">
          <div className="search-box">
            <i className="fas fa-magnifying-glass" />
            <input placeholder="Search by reference or file name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <i className="fas fa-circle-notch fa-spin" />
            <p>Loading history…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-clock-rotate-left" />
            <p>No history yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Fichier importé</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((g) => (
                  <tr key={g.reference}>
                    <td><span className="badge original">#{g.reference}</span></td>
                    <td className="truncate">{g.originalName}</td>
                    <td>{fmtDate(g.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
