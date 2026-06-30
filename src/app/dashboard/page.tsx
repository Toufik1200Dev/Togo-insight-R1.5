"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DashTopbar from "@/components/dashboard/DashTopbar";
import { useToast } from "@/components/Toast";
import type { FileItem } from "@/types";
import { validateCsvContent, type CsvValidationResult } from "@/lib/csvValidation";

// powerbi-client references browser globals at import time — load client-side only.
const PowerBIReport = dynamic(() => import("@/components/PowerBIReport"), {
  ssr: false,
  loading: () => (
    <div className="pbi-frame">
      <div className="pbi-placeholder">
        <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
        <p>Chargement du dashboard…</p>
      </div>
    </div>
  ),
});

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
  const [sort, setSort] = useState<"new" | "old" | "name">("new");
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [calcNote, setCalcNote] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [validation, setValidation] = useState<CsvValidationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Stop polling when the component unmounts.
  useEffect(() => {
    return () => {
      if (pollIdRef.current) clearInterval(pollIdRef.current);
    };
  }, []);

  // After upload, watch the Azure Data Factory pipeline run that the blob event
  // triggered. When it succeeds, reveal the (live, Snowflake-backed) dashboard.
  const pollAdf = useCallback(
    (sinceIso: string, fileName: string) => {
      let tries = 0;
      const max = 120; // ~10 min at 5s
      const id = setInterval(async () => {
        tries += 1;
        try {
          const qs = new URLSearchParams({ since: sinceIso, file: fileName });
          const res = await fetch(`/api/adf/status?${qs.toString()}`, { cache: "no-store" });
          const json = await res.json();
          if (res.ok && json.success) {
            if (json.configured === false) {
              // ADF not wired (e.g. local dev) — let the user reveal manually.
              clearInterval(id);
              setCalcNote(
                "Le calcul s'exécute dans Azure Data Factory. Affichez le dashboard dès qu'il est prêt."
              );
              return;
            }
            if (json.status === "succeeded") {
              clearInterval(id);
              setDashboardReady(true);
              toast("Calcul terminé — votre dashboard est prêt.", "success");
              return;
            }
            if (json.status === "failed") {
              clearInterval(id);
              setCalcError("Le calcul a échoué dans Azure Data Factory.");
              return;
            }
            // pending | running → keep polling
          }
        } catch {
          /* keep polling */
        }
        if (tries >= max) {
          clearInterval(id);
          setCalcNote("Le calcul prend plus de temps que prévu.");
        }
      }, 5000);
      return id;
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
      setDashboardReady(false);
      setCalcNote(null);
      setCalcError(null);
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
          toast("Fichier importé. Calcul en cours…", "success");
          setActiveRef(json.fileReference);
          await loadFiles();
          if (pollIdRef.current) clearInterval(pollIdRef.current);
          pollIdRef.current = pollAdf(json.uploadedAt || new Date().toISOString(), file.name);
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
    [loadFiles, pollAdf, toast]
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

  // Inputs only: the user uploads CSVs; results live in Snowflake, surfaced via Power BI.
  const visible = useMemo(() => {
    let list = files.filter((f) => f.fileType === "original");
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
  }, [files, search, sort]);

  const importedCount = useMemo(
    () => files.filter((f) => f.fileType === "original").length,
    [files]
  );

  function resetUpload() {
    if (pollIdRef.current) clearInterval(pollIdRef.current);
    setActiveRef(null);
    setDashboardReady(false);
    setCalcNote(null);
    setCalcError(null);
  }

  return (
    <>
      <DashTopbar
        title="Files"
        subtitle="Importez vos CSV réseau. Ils sont chargés dans Snowflake via Azure Data Factory, puis affichés en direct dans Power BI."
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
              <div className="up-hint">or click to browse · CSV only</div>
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
                Keep the export naming format (e.g. <code>RawData_ExportToCsv_2025…csv</code>). The file is
                loaded into Snowflake by Azure Data Factory and surfaced live in Power BI — no files are
                returned.
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

            {/* Processing → calculating animation, then the live dashboard, inline. */}
            {activeRef && !dashboardReady && (
              <div className="calc-panel" role="status" aria-live="polite">
                <div className="calc-spinner" aria-hidden="true">
                  <i className="fas fa-circle-notch fa-spin" />
                </div>
                <div className="calc-title">
                  En train de calculer<span className="calc-dots"><span>.</span><span>.</span><span>.</span></span>
                </div>
                <p className="calc-sub">
                  Azure Data Factory charge vos données dans Snowflake et exécute les calculs KPI. Power BI
                  affichera les résultats automatiquement.
                </p>
                <div className="calc-steps" aria-hidden="true">
                  <span className="calc-step done"><i className="fas fa-file-csv" /> CSV importé</span>
                  <i className="fas fa-arrow-right calc-step-arrow" />
                  <span className="calc-step active"><i className="fas fa-snowflake" /> Data Factory + Snowflake</span>
                  <i className="fas fa-arrow-right calc-step-arrow" />
                  <span className="calc-step"><i className="fas fa-chart-column" /> Power BI</span>
                </div>

                {calcError ? (
                  <div className="calc-timeout">
                    <p style={{ color: "#ff9db0" }}>{calcError}</p>
                    <button type="button" className="btn-ghost" onClick={() => setDashboardReady(true)}>
                      <i className="fas fa-chart-column" /> Afficher le dashboard
                    </button>
                  </div>
                ) : calcNote ? (
                  <div className="calc-timeout">
                    <p>{calcNote}</p>
                    <button type="button" className="btn-ghost" onClick={() => setDashboardReady(true)}>
                      <i className="fas fa-chart-column" /> Afficher le dashboard
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {activeRef && dashboardReady && (
              <div className="calc-result">
                <div className="calc-result-head">
                  <h3>
                    <i className="fas fa-circle-check" style={{ color: "#7ce6a8", marginRight: 8 }} />
                    Votre dashboard
                  </h3>
                  <button type="button" className="btn-ghost" onClick={resetUpload}>
                    <i className="fas fa-rotate-right" /> Charger un nouveau fichier
                  </button>
                </div>
                <PowerBIReport />
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
                {visible.map((f) => (
                  <div className="file-row" key={f.id}>
                    <div className="file-ic">
                      <i className="fas fa-file-csv" />
                    </div>
                    <div className="file-meta">
                      <div className="file-name">{f.fileName}</div>
                      <div className="file-sub">
                        Ref {f.fileReference} · {fmtDate(f.uploadedAt)}
                      </div>
                    </div>
                    <span className="badge original">CSV</span>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete"
                      onClick={() => handleDelete(f.id)}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <aside>
          <div className="rail-card">
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", marginBottom: 10 }}>Summary</h3>
            <div className="rail-stat"><span className="k">Fichiers importés</span><span className="v">{importedCount}</span></div>
          </div>

          <div className="rail-card">
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", marginBottom: 8 }}>Dashboards</h3>
            <p className="text-muted" style={{ marginBottom: 14, fontSize: "0.85rem" }}>
              Vos données alimentent Power BI en direct depuis Snowflake. Ouvrez l&apos;onglet Dashboards.
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
