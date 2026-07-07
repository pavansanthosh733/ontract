import React, { useCallback, useEffect, useState } from "react";
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

  // ✅ NEW: active quick tab
  const [activeQuickFilter, setActiveQuickFilter] = useState("today");

  // ✅ NEW: per-column text filters
  const [columnFilters, setColumnFilters] = useState({
    workorder: "",
    contractor: "",
    assignedTime: "",
    status: "",
    expiryTime: "",
  });

  /* ================= DATE RANGE HELPERS ================= */
  const toInputDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getTodayRange = () => {
    const today = new Date();
    const val = toInputDate(today);
    return { from: val, to: val };
  };

  const getThisWeekRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? 6 : day - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { from: toInputDate(monday), to: toInputDate(sunday) };
  };

  const getThisMonthRange = () => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toInputDate(first), to: toInputDate(last) };
  };

  /* ================= ✅ NEW: CORE RANGE FETCH ================= */
  const fetchAssignmentsForRange = useCallback(async (from, to, statusVal) => {
    if (!from || !to) {
      alert("Please select From Date and To Date");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      if (statusVal && statusVal !== "All") params.append("status", statusVal);

      const res = await apiGet(
        `/api/admin/workorders/workorder-lifecycle?${params.toString()}`
      );

      setRows(Array.isArray(res) ? res : []);
      setShowResults(true);
    } catch (err) {
      setError("Failed to fetch workorder assignment data");
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= FETCH ASSIGNMENTS (Submit button, unchanged behavior) ================= changinggto move into git */
  const fetchAssignments = async () => {
    if (!fromDate || !toDate) {
      alert("Please select From Date and To Date");
      return;
    }
    setActiveQuickFilter("custom");
    await fetchAssignmentsForRange(fromDate, toDate, status);
  };

  /* ================= ✅ NEW: QUICK FILTER TAB HANDLER ================= just for fun aeafd*/
  const handleQuickFilter = useCallback(
    (type) => {
      let range;
      if (type === "today") range = getTodayRange();
      else if (type === "week") range = getThisWeekRange();
      else if (type === "month") range = getThisMonthRange();
      else return;

      setFromDate(range.from);
      setToDate(range.to);
      setActiveQuickFilter(type);
      fetchAssignmentsForRange(range.from, range.to, status);
    },
    [status, fetchAssignmentsForRange]
  );

  /* ================= ✅ NEW: DEFAULT LOAD = TODAY ================= */
  useEffect(() => {
    handleQuickFilter("today");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= RESET FILTERS (now resets to Today) ================= */
  const resetFilters = () => {
    setStatus("All");
    setError(null);
    setColumnFilters({
      workorder: "",
      contractor: "",
      assignedTime: "",
      status: "",
      expiryTime: "",
    });
    handleQuickFilter("today");
  };

  /* ================= ✅ NEW: COLUMN FILTER HANDLER ================= */
  const handleColumnFilterChange = (e) => {
    const { name, value } = e.target;
    setColumnFilters((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= ✅ NEW: APPLY COLUMN FILTERS ================= */
  const displayedRows = rows.filter((row) => {
    const workorderMatch = (row.WORKORDER_ID || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.workorder.toLowerCase());

    const contractorMatch = (row.company_name || row.name || "-")
      .toString()
      .toLowerCase()
      .includes(columnFilters.contractor.toLowerCase());

    const assignedTimeMatch = formatDate(row.assigned_at)
      .toString()
      .toLowerCase()
      .includes(columnFilters.assignedTime.toLowerCase());

    const statusMatch = (row.assignment_status || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.status.toLowerCase());

    const expiryTimeMatch = formatDate(row.expiry_time)
      .toString()
      .toLowerCase()
      .includes(columnFilters.expiryTime.toLowerCase());

    return (
      workorderMatch &&
      contractorMatch &&
      assignedTimeMatch &&
      statusMatch &&
      expiryTimeMatch
    );
  });

  return (
    <div className="workorders-page">
      {/* ===== FILTER CARD ===== */}
      <div className="dashboard-card">
        <div className="dashboard-header">Work Orders Assignment</div>

        <div className="dashboard-content">

          {/* ✅ NEW: QUICK FILTER TABS */}
          <div className="quick-filter-tabs">
            <button
              type="button"
              className={`quick-tab-btn ${activeQuickFilter === "today" ? "active" : ""}`}
              onClick={() => handleQuickFilter("today")}
            >
              Today
            </button>

            <button
              type="button"
              className={`quick-tab-btn ${activeQuickFilter === "week" ? "active" : ""}`}
              onClick={() => handleQuickFilter("week")}
            >
              This Week
            </button>

            <button
              type="button"
              className={`quick-tab-btn ${activeQuickFilter === "month" ? "active" : ""}`}
              onClick={() => handleQuickFilter("month")}
            >
              This Month
            </button>
          </div>

          <div className="dashboard-filters">
            <div>
              <label>From Date:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActiveQuickFilter("custom");
                }}
              />
            </div>

            <div>
              <label>To Date:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActiveQuickFilter("custom");
                }}
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

                {/* ✅ NEW: COLUMN FILTER ROW */}
                <tr>
                  <th>
                    <input
                      type="text"
                      name="workorder"
                      placeholder="Filter..."
                      value={columnFilters.workorder}
                      onChange={handleColumnFilterChange}
                      className="wo-filter-input"
                    />
                  </th>
                  <th>
                    <input
                      type="text"
                      name="contractor"
                      placeholder="Filter..."
                      value={columnFilters.contractor}
                      onChange={handleColumnFilterChange}
                      className="wo-filter-input"
                    />
                  </th>
                  <th>
                    <input
                      type="text"
                      name="assignedTime"
                      placeholder="Filter..."
                      value={columnFilters.assignedTime}
                      onChange={handleColumnFilterChange}
                      className="wo-filter-input"
                    />
                  </th>
                  <th>
                    <input
                      type="text"
                      name="status"
                      placeholder="Filter..."
                      value={columnFilters.status}
                      onChange={handleColumnFilterChange}
                      className="wo-filter-input"
                    />
                  </th>
                  <th>
                    <input
                      type="text"
                      name="expiryTime"
                      placeholder="Filter..."
                      value={columnFilters.expiryTime}
                      onChange={handleColumnFilterChange}
                      className="wo-filter-input"
                    />
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      No data found
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row, index) => (
                    <tr key={index}>
                      <td>{row.WORKORDER_ID}</td>
                      <td>{row.company_name || row.name || "-"}</td>
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