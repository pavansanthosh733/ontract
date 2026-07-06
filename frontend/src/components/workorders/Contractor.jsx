// src/pages/Contractor.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/contractor.css";
import { apiGet } from "../../api";

const WorkOrders = () => {
  const [workorders, setWorkorders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("All");

  // ✅ NEW: which quick tab is active
  const [activeQuickFilter, setActiveQuickFilter] = useState("today");

  // ✅ NEW: per-column text filters
  const [columnFilters, setColumnFilters] = useState({
    workorder: "",
    category: "",
    region: "",
    status: "",
    requestedTime: "",
    remarks: "",
    createdAt: "",
  });

  const navigate = useNavigate();

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

  /* ================= FETCH ALL (kept, unused by default now but harmless to keep) ================= */
  const fetchWorkOrders = async () => {
    try {
      const data = await apiGet("/api/admin/workorders/");

      setWorkorders(data || []);
      setFilteredOrders(data || []);

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  /* ================= ✅ NEW: CORE RANGE FETCH ================= */
  const fetchWorkOrdersForRange = useCallback(async (from, to, statusVal) => {
    try {
      setLoading(true);
      setError(null);

      if (!from || !to) {
        alert("Please select From Date and To Date");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      params.append("status", statusVal || "All");

      const data = await apiGet(`/api/admin/workorders/filter?${params.toString()}`);

      setWorkorders(data || []);
      setFilteredOrders(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch workorders");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= ✅ NEW: QUICK FILTER TAB HANDLER ================= */
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
      fetchWorkOrdersForRange(range.from, range.to, status);
    },
    [status, fetchWorkOrdersForRange]
  );

  /* ================= ✅ NEW: DEFAULT LOAD = TODAY ================= */
  useEffect(() => {
    handleQuickFilter("today");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= FILTER SUBMIT (unchanged behavior, marks tab as custom) ================= */
  const handleSubmit = async () => {
    if (!fromDate || !toDate) {
      alert("Please select From Date and To Date");
      return;
    }

    setActiveQuickFilter("custom");
    await fetchWorkOrdersForRange(fromDate, toDate, status);
  };

  /* ================= RESET (now resets to Today instead of all) ================= */
  const handleReset = async () => {
    setStatus("All");
    setColumnFilters({
      workorder: "",
      category: "",
      region: "",
      status: "",
      requestedTime: "",
      remarks: "",
      createdAt: "",
    });
    handleQuickFilter("today");
  };

  /* ================= ✅ NEW: COLUMN FILTER HANDLER ================= */
  const handleColumnFilterChange = (e) => {
    const { name, value } = e.target;
    setColumnFilters((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= ✅ NEW: APPLY COLUMN FILTERS ================= */
  const displayedOrders = filteredOrders.filter((wo) => {
    const woStatus = (wo.status || wo.STATUS || "").toString();

    const workorderMatch = (wo.workorder || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.workorder.toLowerCase());

    const categoryMatch = (wo.category_name || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.category.toLowerCase());

    const regionMatch = (wo.region_name || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.region.toLowerCase());

    const statusMatch = woStatus
      .toLowerCase()
      .includes(columnFilters.status.toLowerCase());

    const requestedTimeMatch = (wo.requested_time_close || "N/A")
      .toString()
      .toLowerCase()
      .includes(columnFilters.requestedTime.toLowerCase());

    const remarksMatch = (wo.remarks || "-")
      .toString()
      .toLowerCase()
      .includes(columnFilters.remarks.toLowerCase());

    const createdAtMatch = (
      wo.created_t ? new Date(wo.created_t).toLocaleString() : "N/A"
    )
      .toString()
      .toLowerCase()
      .includes(columnFilters.createdAt.toLowerCase());

    return (
      workorderMatch &&
      categoryMatch &&
      regionMatch &&
      statusMatch &&
      requestedTimeMatch &&
      remarksMatch &&
      createdAtMatch
    );
  });

  if (loading) return <div className="center">Loading...</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="workorders-fullpage-container">
      <div className="workorders-content">
        <h2>WORK ORDERS DASHBOARD2</h2>

        {/* ================= ✅ NEW: QUICK FILTER TABS ================= */}
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

        {/* ================= FILTER SECTION ================= */}
        <div className="filters-container">
          <div className="filter-group">
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

          <div className="filter-group">
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

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              <option value="All">
                All
              </option>

              <option value="OPEN">
                OPEN
              </option>

              <option value="ACCEPTED">
                ACCEPTED
              </option>

              <option value="REJECTED">
                REJECTED
              </option>

              <option value="WITHDRAW">
                WITHDRAW
              </option>
            </select>
          </div>

          <button className="submit-btn" onClick={handleSubmit}>
            🔍 Submit
          </button>

          <button className="reset-btn" onClick={handleReset}>
            🔄 Reset
          </button>
        </div>

        {/* ================= TABLE ================= */}
        <div className="table-wrapper">
          <table className="workorders-table">
            <thead>
              <tr>
                <th>WORK ORDER</th>
                <th>CATEGORY</th>
                <th>REGION</th>
                <th>STATUS</th>
                <th>REQUESTED TIME CLOSE</th>
                <th>REMARKS</th>
                <th>CREATED AT</th>
              </tr>

              {/* ✅ NEW: COLUMN FILTER ROW fun code */}
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
                    name="category"
                    placeholder="Filter..."
                    value={columnFilters.category}
                    onChange={handleColumnFilterChange}
                    className="wo-filter-input"
                  />
                </th>
                <th>
                  <input
                    type="text"
                    name="region"
                    placeholder="Filter..."
                    value={columnFilters.region}
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
                    name="requestedTime"
                    placeholder="Filter..."
                    value={columnFilters.requestedTime}
                    onChange={handleColumnFilterChange}
                    className="wo-filter-input"
                  />
                </th>
                <th>
                  <input
                    type="text"
                    name="remarks"
                    placeholder="Filter..."
                    value={columnFilters.remarks}
                    onChange={handleColumnFilterChange}
                    className="wo-filter-input"
                  />
                </th>
                <th>
                  <input
                    type="text"
                    name="createdAt"
                    placeholder="Filter..."
                    value={columnFilters.createdAt}
                    onChange={handleColumnFilterChange}
                    className="wo-filter-input"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No workorders found
                  </td>
                </tr>
              ) : (
                displayedOrders.map((wo) => (
                  <tr key={wo.workorder}>
                    <td
                      onClick={() =>
                        navigate(
                          `/admin/workorder/contractor/workorderdetails/${wo.workorder}`
                        )
                      }
                    >
                      {wo.workorder}
                    </td>

                    <td>{wo.category_name}</td>
                    <td>{wo.region_name}</td>

                    <td
                      className={`status-${(
                        wo.status ||
                        wo.STATUS ||
                        ""
                      ).toLowerCase()}`}
                    >
                      {wo.status || wo.STATUS}
                    </td>

                    <td>{wo.requested_time_close || "N/A"}</td>

                    <td>{wo.remarks || "-"}</td>

                    <td>
                      {wo.created_t
                        ? new Date(wo.created_t).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkOrders;