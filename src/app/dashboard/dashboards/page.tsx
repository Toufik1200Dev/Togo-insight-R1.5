"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DashTopbar from "@/components/dashboard/DashTopbar";
import type { FileItem } from "@/types";

// powerbi-client references browser globals at import time — load client-side only.
const PowerBIReport = dynamic(() => import("@/components/PowerBIReport"), {
  ssr: false,
  loading: () => (
    <div className="pbi-frame">
      <div className="pbi-placeholder">
        <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
        <p>Loading dashboard…</p>
      </div>
    </div>
  ),
});

export default function DashboardsPage() {
  const [refs, setRefs] = useState<string[]>([]);
  const [operator, setOperator] = useState("all");
  const [period, setPeriod] = useState("all");
  const [selectedRef, setSelectedRef] = useState("all");

  useEffect(() => {
    fetch("/api/files", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const list = (j.files as FileItem[])
            .filter((f) => f.fileType === "original")
            .map((f) => f.fileReference);
          setRefs(Array.from(new Set(list)));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <DashTopbar
        title="Dashboards"
        subtitle="Interactive Power BI reports built from your processed Azure data. Use the filters below or the report's own filter pane."
      />

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-field">
          <label>Dataset / reference</label>
          <select className="select-pill" value={selectedRef} onChange={(e) => setSelectedRef(e.target.value)}>
            <option value="all">All references</option>
            {refs.map((r) => (
              <option key={r} value={r}>
                Ref {r}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Operator</label>
          <select className="select-pill" value={operator} onChange={(e) => setOperator(e.target.value)}>
            <option value="all">All operators</option>
            <option value="togocom">Togo Telecom</option>
            <option value="moov">Moov Togo</option>
          </select>
        </div>
        <div className="filter-field">
          <label>Period</label>
          <select className="select-pill" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="quarter">This quarter</option>
          </select>
        </div>
        <div className="filter-field" style={{ alignSelf: "flex-end" }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setOperator("all");
              setPeriod("all");
              setSelectedRef("all");
            }}
          >
            <i className="fas fa-rotate-left" /> Reset filters
          </button>
        </div>
      </div>

      <PowerBIReport />
    </>
  );
}
