import React, { useState } from "react";
import "./css/contractor.css";
import { apiGet } from "../../api";

const WorkorderAssignment = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("All");
  const [showResults, setShowResults] = useState(false);

  /* ================= FETCH ASSIGNMENTS ================= */
  const fetchAssignments = async () => {
    if (!fromDate || !toDate) {
      alert("Please select From Date and To Date");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("from", fromDate);
      params.append("to", toDate);
      if (status !== "All") params.append("status", status);

      const res = await apiGet(
        `/api/workorders/workorder-lifecycle?${params.toString()}`
      );

      setRows(Array.isArray(res) ? res : []);
      setShowResults(true);
    } catch (err) {
      setError("Failed to fetch workorder assignment data");
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  /* ================= RESET FILTERS (ONLY ONCE) ================= */
  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setStatus("All");
    setRows([]);
    setShowResults(false);
    setError(null);
  };

  return (
    <div className="workorders-page">
      {/* ===== FILTER CARD ===== */}
      <div className="dashboard-card">
        <div className="dashboard-header">Work Orders Assignment</div>

        <div className="dashboard-content">
          <div className="dashboard-filters">
            <div>
              <label>From Date:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label>To Date:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div>
              <label>Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="All">All</option>
                <option value="PENDING">PENDING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div className="dashboard-btn-group">
              <button className="btn btn-green" onClick={fetchAssignments}>
                🔍 Submit
              </button>
              <button className="btn btn-blue" onClick={resetFilters}>
                🔄 Reset
              </button>
            </div>
          </div>

          {loading && <div className="info-message">Loading data...</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      {/* ===== RESULTS TABLE ===== */}
      {showResults && (
        <div className="dashboard-card results-card">
          <div className="dashboard-header">
            Workorder Assignment List
          </div>

          <div className="table-wrapper">
            <table className="workorders-table">
              <thead>
                <tr>
                  <th>Work Order</th>
                  <th>Contractor Name</th>
                  <th>Assigned Time</th>
                  <th>Status</th>
                  <th>Expiry Time</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      No data found
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={index}>
                      <td>{row.WORKORDER_ID}</td>
                      <td>{row.name || "-"}</td>
                      <td>{formatDate(row.assigned_at)}</td>
                      <td className={`status ${row.assignment_status?.toLowerCase()}`}>
                        {row.assignment_status}
                      </td>
                      <td>{formatDate(row.expiry_time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= DATE FORMAT ================= */
const formatDate = (val) => {
  if (!val) return "-";
  return new Date(val).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default WorkorderAssignment;