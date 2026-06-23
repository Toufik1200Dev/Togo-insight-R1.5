"use client";

import { useCallback, useEffect, useState } from "react";
import { PowerBIEmbed } from "powerbi-client-react";
import { models } from "powerbi-client";

interface EmbedState {
  loading: boolean;
  configured: boolean;
  error?: string;
  reportId?: string;
  embedUrl?: string;
  embedToken?: string;
  reportName?: string;
}

export default function PowerBIReport() {
  const [state, setState] = useState<EmbedState>({ loading: true, configured: false });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const res = await fetch("/api/powerbi/embed-token", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setState({ loading: false, configured: true, error: data.message || "Failed to load report." });
        return;
      }
      if (!data.configured) {
        setState({ loading: false, configured: false });
        return;
      }
      setState({
        loading: false,
        configured: true,
        reportId: data.reportId,
        embedUrl: data.embedUrl,
        embedToken: data.embedToken,
        reportName: data.reportName,
      });
    } catch (e) {
      setState({ loading: false, configured: true, error: e instanceof Error ? e.message : "Network error." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return (
      <div className="pbi-frame">
        <div className="pbi-placeholder">
          <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
          <p>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // Power BI not configured yet → show what to set.
  if (!state.configured) {
    return (
      <div className="pbi-frame">
        <div className="pbi-placeholder">
          <i className="fas fa-chart-column" aria-hidden="true" />
          <h3>Connect Power BI</h3>
          <p>
            Set <code>POWERBI_*</code> variables in your environment to embed your workspace report.
          </p>
          <p className="text-muted">
            Required: <code>POWERBI_TENANT_ID</code>, <code>POWERBI_CLIENT_ID</code>,{" "}
            <code>POWERBI_CLIENT_SECRET</code>, <code>POWERBI_WORKSPACE_ID</code>, <code>POWERBI_REPORT_ID</code>.
          </p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="pbi-frame">
        <div className="pbi-placeholder">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" style={{ color: "#ffb3b3" }} />
          <h3>Couldn&apos;t load the report</h3>
          <p className="text-muted">{state.error}</p>
          <button type="button" className="btn-ghost" onClick={load}>
            <i className="fas fa-rotate-right" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pbi-frame">
      <PowerBIEmbed
        embedConfig={{
          type: "report",
          id: state.reportId,
          embedUrl: state.embedUrl,
          accessToken: state.embedToken,
          tokenType: models.TokenType.Embed,
          settings: {
            panes: {
              filters: { visible: true, expanded: false },
              pageNavigation: { visible: true },
            },
            background: models.BackgroundType.Transparent,
          },
        }}
        cssClassName="report-style-class"
        getEmbeddedComponent={() => {
          /* report instance available here if needed */
        }}
      />
    </div>
  );
}
