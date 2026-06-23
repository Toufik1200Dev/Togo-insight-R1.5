"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DashTopbar from "@/components/dashboard/DashTopbar";
import { useToast } from "@/components/Toast";
import type { FileItem } from "@/types";
import { validateCsvContent, type CsvValidationResult } from "@/lib/csvValidation";

type Filter = "all" | "original" | "lillybelle" | "arcep";

const TYPE_LABEL: Record<string, string> = {
  original: "Original CSV",
  lillybelle: "Lillybelle",
  arcep: "ARCEP",
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function FilesPage() {
  const toast = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"new" | "old" | "name">("new");
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [validation, setValidation] = useState<CsvValidationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) setFiles(json.files);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Poll Azure for processed outputs after an upload.
  const pollRefresh = useCallback(
    (reference: string) => {
      let tries = 0;
      const max = 60; // ~5 min at 5s
      const id = setInterval(async () => {
        tries += 1;
        try {
          const res = await fetch(`/api/files/refresh/${reference}`, { cache: "no-store" });
          const json = await res.json();
          if (res.ok && json.success) {
            setFiles((prev) => {
              const others = prev.filter((f) => f.fileReference !== reference);
              return [...json.files, ...others].sort(
                (a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)
              );
            });
            const outputs = (json.files as FileItem[]).filter(
              (f) => f.fileType === "lillybelle" || f.fileType === "arcep"
            );
            if (outputs.length > 0 && outputs.every((f) => f.isReady)) {
              clearInterval(id);
              toast("All processed files are ready!", "success");
            }
          }
        } catch {
          /* keep polling */
        }
        if (tries >= max) clearInterval(id);
      }, 5000);
    },
    [toast]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast("Please select a CSV file.", "error");
        return;
      }

      // Client-side sanity check BEFORE uploading — pinpoints exactly what's wrong.
      setValidation(null);
      let text: string;
      try {
        text = await file.text();
      } catch {
        toast("Could not read the file.", "error");
        return;
      }
      const result = validateCsvContent(text);
      if (!result.valid) {
        setValidation(result);
        toast("CSV check failed — see the details below.", "error");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (res.ok && json.success) {
          toast("File uploaded. Processing started…", "success");
          setActiveRef(json.fileReference);
          await loadFiles();
          pollRefresh(json.fileReference);
        } else {
          if (json.validation) setValidation(json.validation as CsvValidationResult);
          toast(json.message || "Upload failed.", "error");
        }
      } catch {
        toast("Upload failed. Please try again.", "error");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [loadFiles, pollRefresh, toast]
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this file record?")) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setFiles((p) => p.filter((f) => f.id !== id));
        toast("File deleted.", "success");
      } else {
        toast(json.message || "Could not delete file.", "error");
      }
    } catch {
      toast("Network error.", "error");
    }
  }

  const visible = useMemo(() => {
    let list = [...files];
    if (filter !== "all") list = list.filter((f) => f.fileType === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) => f.fileName.toLowerCase().includes(q) || f.originalName.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sort === "name") return a.fileName.localeCompare(b.fileName);
      const t = +new Date(a.uploadedAt) - +new Date(b.uploadedAt);
      return sort === "new" ? -t : t;
    });
    return list;
  }, [files, filter, search, sort]);

  const counts = useMemo(() => {
    return {
      total: files.length,
      original: files.filter((f) => f.fileType === "original").length,
      lillybelle: files.filter((f) => f.fileType === "lillybelle").length,
      arcep: files.filter((f) => f.fileType === "arcep").length,
      ready: files.filter((f) => (f.fileType === "lillybelle" || f.fileType === "arcep") && f.isReady).length,
    };
  }, [files]);

  const activeGroup = activeRef ? files.filter((f) => f.fileReference === activeRef) : [];

  return (
    <>
      <DashTopbar
        title="Files"
        subtitle="Upload your network CSV files. They are stored on Azure, processed, and surfaced as Power BI dashboards."
      />

      <div className="dash-grid">
        <div>
          {/* Upload */}
          <div className="panel" style={{ marginBottom: 22 }}>
            <div className="panel-head">
              <h2>Upload data</h2>
            </div>
            <div
              className={`upload-zone ${dragOver ? "drag-over" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleUpload(f);
              }}
            >
              <div className="up-icon">
                <i className={`fas ${uploading ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"}`} />
              </div>
              <div className="up-title">{uploading ? "Uploading…" : "Drag & drop your CSV here"}</div>
              <div className="up-hint">or click to browse · CSV only · outputs are produced as XLSX</div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </div>

            <div className="upload-note">
              <i className="fas fa-circle-info" />
              <span>
                Keep the export naming format (e.g. <code>RawData_ExportToCsv_2025…csv</code>) so the
                reference number is detected and matched to its outputs.
              </span>
            </div>

            {validation && !validation.valid && (
              <div className="csv-report" role="alert">
                <div className="csv-report-head">
                  <i className="fas fa-triangle-exclamation" /> CSV check failed — fix these and re-upload
                </div>

                {validation.emptyFile && <div className="csv-report-item">The file is empty.</div>}

                {validation.headerError && (
                  <div className="csv-report-item">
                    <strong>Header doesn&apos;t match the expected drive-test format.</strong>
                    <br />
                    Found <span className="lines">{validation.headerError.actualCount}</span> columns, expected{" "}
                    <span className="lines">{validation.headerError.expectedCount}</span>.
                    {validation.headerError.firstDiffIndex >= 0 && (
                      <>
                        {" "}
                        First difference at{" "}
                        <span className="lines">column {validation.headerError.firstDiffIndex + 1}</span>: expected{" "}
                        <code>{validation.headerError.expectedCol ?? "—"}</code>, found{" "}
                        <code>{validation.headerError.actualCol ?? "—"}</code>.
                      </>
                    )}
                  </div>
                )}

                {validation.columnErrors.map((ce) => (
                  <div className="csv-report-item" key={ce.column}>
                    Column <code>{ce.column}</code> — invalid or missing value at line(s):{" "}
                    <span className="lines">{ce.lines.join(", ")}</span>
                    {ce.allowed && <div className="allowed">Allowed: {ce.allowed.join(", ")}</div>}
                  </div>
                ))}

                <button type="button" className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setValidation(null)}>
                  Dismiss
                </button>
              </div>
            )}

            {activeGroup.length > 0 && (
              <div className="pipeline">
                <div className="pipe-step">
                  <div className="pi"><i className="fas fa-file-csv" /></div>
                  <div className="pl">Original</div>
                  <div className="ps">Uploaded</div>
                </div>
                <div className="pipe-arrow"><i className="fas fa-arrow-right" /></div>
                {["lillybelle", "arcep"].map((t) => {
                  const f = activeGroup.find((x) => x.fileType === t);
                  const ready = f?.isReady;
                  return (
                    <div className="pipe-step" key={t}>
                      <div className="pi">
                        <i className={`fas ${ready ? "fa-circle-check" : "fa-hourglass-half fa-spin"}`} />
                      </div>
                      <div className="pl">{TYPE_LABEL[t]} output</div>
                      <div className="ps">{ready ? "Ready" : "Processing…"}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* File list */}
          <div className="panel">
            <div className="panel-head">
              <h2>Your files</h2>
              <button type="button" className="btn-ghost" onClick={loadFiles}>
                <i className="fas fa-rotate-right" /> Refresh
              </button>
            </div>

            <div className="toolbar">
              <div className="search-box">
                <i className="fas fa-magnifying-glass" />
                <input
                  placeholder="Search files…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="select-pill" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="new">Newest first</option>
                <option value="old">Oldest first</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>

            <div className="chip-group" style={{ marginBottom: 16 }}>
              {(["all", "original", "lillybelle", "arcep"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`chip ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : TYPE_LABEL[f]}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty-state">
                <i className="fas fa-circle-notch fa-spin" />
                <p>Loading files…</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-folder-open" />
                <p>No files yet. Upload a CSV to get started.</p>
              </div>
            ) : (
              <div className="file-list">
                {visible.map((f) => {
                  const isOutput = f.fileType === "lillybelle" || f.fileType === "arcep";
                  return (
                    <div className="file-row" key={f.id}>
                      <div className="file-ic">
                        <i className={`fas ${f.fileType === "original" ? "fa-file-csv" : "fa-file-excel"}`} />
                      </div>
                      <div className="file-meta">
                        <div className="file-name">{f.fileName}</div>
                        <div className="file-sub">
                          Ref {f.fileReference} · {fmtDate(f.uploadedAt)}
                        </div>
                      </div>
                      <span className={`badge ${f.fileType}`}>{TYPE_LABEL[f.fileType] || f.fileType}</span>
                      {isOutput && (
                        <span className={`badge ${f.isReady ? "ready" : "pending"}`}>
                          {f.isReady ? "Ready" : "Processing"}
                        </span>
                      )}
                      {isOutput && f.isReady && (
                        <a
                          className="icon-btn"
                          href={`/api/download/${f.fileToken}`}
                          title="Download"
                        >
                          <i className="fas fa-download" />
                        </a>
                      )}
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete"
                        onClick={() => handleDelete(f.id)}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <aside>
          <div className="rail-card">
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", marginBottom: 10 }}>Summary</h3>
            <div className="rail-stat"><span className="k">Total files</span><span className="v">{counts.total}</span></div>
            <div className="rail-stat"><span className="k">Original CSV</span><span className="v">{counts.original}</span></div>
            <div className="rail-stat"><span className="k">Lillybelle</span><span className="v">{counts.lillybelle}</span></div>
            <div className="rail-stat"><span className="k">ARCEP</span><span className="v">{counts.arcep}</span></div>
            <div className="rail-stat"><span className="k">Outputs ready</span><span className="v">{counts.ready}</span></div>
          </div>

          <div className="rail-card">
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", marginBottom: 8 }}>Dashboards</h3>
            <p className="text-muted" style={{ marginBottom: 14, fontSize: "0.85rem" }}>
              Processed data feeds your Power BI report. Open it in the Dashboards tab.
            </p>
            <Link href="/dashboard/dashboards" className="btn-primary" style={{ width: "100%", textAlign: "center" }}>
              <i className="fas fa-chart-column" /> Open dashboards
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
