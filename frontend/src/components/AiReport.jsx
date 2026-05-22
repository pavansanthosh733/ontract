import React, { useMemo, useState } from "react";
import { apiPost } from "../api";
import * as XLSX from "xlsx";
import "./css/aiReport.css";

const PROMPT_SUGGESTIONS = [
  "Show workorder report for last month",
  "Top 5 contractors by open workorders",
  "Show rate comparison report for last month with workorder, created time, price, service rate and difference",
  "Compare contractor A and contractor B side by side",

];

function isIsoLikeDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "number") {
    return Number.isFinite(value) && String(value).includes(".")
      ? value.toFixed(2)
      : String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "-";
    }
  }

  if (isIsoLikeDate(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }

  return String(value);
}

function inferColumnsFromRows(rows) {
  const keys = new Set();

  rows.forEach((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      Object.keys(row).forEach((key) => keys.add(key));
    }
  });

  return Array.from(keys);
}

function normalizeColumns(columns) {
  if (!Array.isArray(columns)) return [];
  const seen = new Set();
  const out = [];

  columns.forEach((col) => {
    if (typeof col !== "string") return;
    const cleaned = col.trim();
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    out.push(cleaned);
  });

  return out;
}

function flattenRowForExcel(row, columns) {
  const flat = {};
  columns.forEach((col) => {
    flat[col] = formatValue(row?.[col]);
  });
  return flat;
}

const AIReport = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [lastRunAt, setLastRunAt] = useState("");

  const rows = useMemo(() => {
    if (!report) return [];
    if (Array.isArray(report.data)) return report.data;
    if (Array.isArray(report)) return report;
    return [];
  }, [report]);

  const columns = useMemo(() => {
    const backendColumns = normalizeColumns(report?.columns);
    if (backendColumns.length) return backendColumns;
    return inferColumnsFromRows(rows);
  }, [report?.columns, rows]);

  const stats = useMemo(() => {
    return {
      count: rows.length,
      reportType: report?.report_type || "Unknown",
      queryMode: report?.query_mode || "standard",
      source: report?.intent?.source || "manual",
    };
  }, [rows.length, report]);

  const handleGenerate = async (promptOverride) => {
    const cleanPrompt = (promptOverride ?? prompt).trim();

    if (!cleanPrompt) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiPost("/api/ai-report/generate", {
        prompt: cleanPrompt,
      });

      const body = response?.data ?? {};

      if (body?.success === false) {
        setReport(null);
        setError(body?.error || "Failed to generate report.");
      } else {
        setReport(body);
        setLastRunAt(new Date().toLocaleString());
      }
    } catch (err) {
      console.error("AI report error:", err);
      setReport(null);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          "Failed to generate reports."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!rows.length) {
      setError("No data available to download.");
      return;
    }

    const exportColumns = columns.length ? columns : inferColumnsFromRows(rows);
    const exportRows = rows.map((row) => flattenRowForExcel(row, exportColumns));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Report");
    XLSX.writeFile(wb, "ai_dynamic_report.xlsx");
  };

  const handleSuggestionClick = (value) => {
    setPrompt(value);
    setError("");
    handleGenerate(value);
  };

  const handlePromptKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="ai-report-page">
      <div className="ai-report-shell">
        <div className="ai-report-header">
          <div className="ai-report-header-text">
            <h1 className="ai-report-title">AI Dynamic Reports</h1>
            <p className="ai-report-subtitle">
              Type a natural-language prompt and generate workorder, contractor,
              comparison, and summary reports with exact columns.
            </p>
          </div>

          <div className="ai-report-badge">Prompt to Report</div>
        </div>

        <div className="ai-report-card ai-report-input-card">
          <div className="ai-report-grid">
            <div className="ai-field-group ai-field-group-full">
              <label>Prompt</label>
              <textarea
                className="ai-input ai-textarea"
                rows="6"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Example: show top 4 contractors with only contractor name and open workorders"
              />
              <div className="ai-help-text">
                Press Enter to generate. Use Shift + Enter for a new line.
              </div>
            </div>

            <div className="ai-actions">
              <button
                type="button"
                className="ai-btn ai-btn-primary"
                onClick={() => handleGenerate()}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>

              <button
                type="button"
                className="ai-btn ai-btn-secondary"
                onClick={handleDownloadExcel}
                disabled={!rows.length}
              >
                Download Excel
              </button>
            </div>
          </div>

          <div className="ai-suggestion-wrap">
            <div className="ai-suggestion-label">Quick prompts</div>
            <div className="ai-suggestion-list">
              {PROMPT_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="ai-suggestion-chip"
                  onClick={() => handleSuggestionClick(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="ai-alert ai-alert-error">{error}</div>}

        {(report || lastRunAt) && (
          <div className="ai-stats-row">
            <div className="ai-stat-card">
              <div className="ai-stat-label">Records</div>
              <div className="ai-stat-value">{stats.count}</div>
            </div>

            <div className="ai-stat-card">
              <div className="ai-stat-label">Report Type</div>
              <div className="ai-stat-value">{stats.reportType}</div>
            </div>

            <div className="ai-stat-card">
              <div className="ai-stat-label">Mode</div>
              <div className="ai-stat-value">{stats.queryMode}</div>
            </div>

            <div className="ai-stat-card">
              <div className="ai-stat-label">Last Run</div>
              <div className="ai-stat-value">{lastRunAt || "-"}</div>
            </div>
          </div>
        )}

        {report?.summary && (
          <div className="ai-report-card ai-summary-card">
            <div className="ai-summary-title">AI Summary</div>
            <div className="ai-summary-text">{report.summary}</div>
          </div>
        )}

        <div className="ai-report-card ai-table-card">
          <div className="ai-table-header">
            <div>
              <h2 className="ai-table-title">Report Data</h2>
              <p className="ai-table-subtitle">
                The table uses backend-provided columns when available.
              </p>
            </div>
          </div>

          <div className="ai-table-wrapper">
            <table className="ai-report-table">
              <thead>
                <tr>
                  {columns.length > 0 ? (
                    columns.map((col) => (
                      <th key={col}>{col.replace(/_/g, " ")}</th>
                    ))
                  ) : (
                    <th>Data</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={Math.max(columns.length, 1)}
                      className="ai-empty-state"
                    >
                      Generating report...
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((row, index) => (
                    <tr key={index}>
                      {columns.length > 0 ? (
                        columns.map((col) => (
                          <td key={col}>{formatValue(row?.[col])}</td>
                        ))
                      ) : (
                        <td className="ai-empty-state">No columns returned</td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={Math.max(columns.length, 1)}
                      className="ai-empty-state"
                    >
                      No data found. Enter a prompt and generate a report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIReport;