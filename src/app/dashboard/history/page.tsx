"use client";

import { useEffect, useMemo, useState } from "react";
import DashTopbar from "@/components/dashboard/DashTopbar";
import type { FileGroup, FileItem } from "@/types";

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

  function pick(files: FileItem[], type: string) {
    return files.find((f) => f.fileType === type);
  }

  return (
    <>
      <DashTopbar title="History" subtitle="Every upload and its processed Lillybelle / ARCEP outputs, grouped by reference." />

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
                  <th>Original file</th>
                  <th>Lillybelle</th>
                  <th>ARCEP</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((g) => {
                  const lb = pick(g.files, "lillybelle");
                  const ar = pick(g.files, "arcep");
                  return (
                    <tr key={g.reference}>
                      <td><span className="badge original">#{g.reference}</span></td>
                      <td className="truncate">{g.originalName}</td>
                      <td>
                        {lb?.isReady ? (
                          <a className="link-dl" href={`/api/download/${lb.fileToken}`}>
                            <i className="fas fa-download" /> Download
                          </a>
                        ) : (
                          <span className="badge pending">Processing</span>
                        )}
                      </td>
                      <td>
                        {ar?.isReady ? (
                          <a className="link-dl" href={`/api/download/${ar.fileToken}`}>
                            <i className="fas fa-download" /> Download
                          </a>
                        ) : (
                          <span className="badge pending">Processing</span>
                        )}
                      </td>
                      <td>{fmtDate(g.uploadedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
