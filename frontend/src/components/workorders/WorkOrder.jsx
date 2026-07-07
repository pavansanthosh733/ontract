// ==============================================
// src/pages/admin/WorkOrders.jsx
// WITHDRAW ONLY FOR ACCEPTED STATUS
// + DEFAULT TODAY LOAD + QUICK DATE TABS + COLUMN FILTERS
// ==============================================

import React, { useCallback, useEffect, useState } from "react";
import "./css/workorders.css";
import { apiGet, apiPost, BASE_URL } from "../../api";


const WorkOrders = () => {
  const [workorders, setWorkorders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showResults, setShowResults] = useState(false);

  // ✅ NEW: tracks which quick-filter tab is active (today/week/month/custom)
  const [activeQuickFilter, setActiveQuickFilter] = useState("today");

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [previewMedia, setPreviewMedia] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // -----------------------------------
  // PAGINATION STATE
  // -----------------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ NEW: per-column text filters
  const [columnFilters, setColumnFilters] = useState({
    workorder: "",
    category: "",
    region: "",
    status: "",
    requestedTime: "",
    createdAt: "",
    sla: "",
    assignmentType: "",
    contractor: "",
  });

  const withdrawReasons = [
    "Wrong Assignment",
    "Contractor Not Available",
    "Duplicate Work Order",
    "Insufficient Resources",
    "Customer Request",
    "Location Too Far",
    "Other"
  ];

  // -----------------------------------
  // ONLY ACCEPTED workorders can be withdrawn
  // -----------------------------------
  const canWithdraw = (status) =>
    (status || "").toString().toUpperCase() === "ACCEPTED";

  // -----------------------------------
  // ✅ NEW: DATE RANGE HELPERS (yyyy-mm-dd for <input type="date">)
  // -----------------------------------
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

  // -----------------------------------
  // PAGINATION DERIVED DATA
  // (now based on filteredWorkorders, see below)
  // -----------------------------------

  // -----------------------------------
  // ✅ NEW: CORE FETCH — accepts explicit from/to/status so it can be
  // called immediately after a quick-filter click without waiting on
  // async setState to resolve.
  // -----------------------------------
  const fetchWorkOrdersForRange = useCallback(async (from, to, status) => {
    if (!from || !to) {
      setModalMessage("⚠️ Please select both From Date and To Date.");
      setShowModal(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);

      if (status && status !== "All") {
        params.append("status", status);
      }

      const data = await apiGet(`/api/admin/workorders/filter?${params.toString()}`);

      if (!Array.isArray(data) || data.length === 0) {
        setWorkorders([]);
        setShowResults(true); // ✅ still show table (empty state), not a popup, for default loads
      } else {
        setWorkorders(data);
        setCurrentPage(1);
        setShowResults(true);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // -----------------------------------
  // FETCH FILTERED WORKORDERS (Submit button — uses current state)
  // -----------------------------------
  const fetchFilteredWorkOrders = useCallback(async () => {
    await fetchWorkOrdersForRange(fromDate, toDate, statusFilter);
  }, [fromDate, toDate, statusFilter, fetchWorkOrdersForRange]);

  // -----------------------------------
  // ✅ NEW: QUICK FILTER TAB HANDLER (Today / This Week / This Month)
  // -----------------------------------
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
      fetchWorkOrdersForRange(range.from, range.to, statusFilter);
    },
    [statusFilter, fetchWorkOrdersForRange]
  );

  // ✅ NEW: mark as "custom" when user manually submits with their own dates
  const handleSubmitClick = () => {
    setActiveQuickFilter("custom");
    fetchFilteredWorkOrders();
  };

  // -----------------------------------
  // ✅ NEW: DEFAULT LOAD — show today's workorders on page load
  // -----------------------------------
  useEffect(() => {
    handleQuickFilter("today");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------
  // AUTO REFRESH (unchanged, still works for quick filters & custom range)
  // -----------------------------------
  useEffect(() => {
    if (!showResults || !fromDate || !toDate) return;

    const intervalId = setInterval(() => {
      fetchWorkOrdersForRange(fromDate, toDate, statusFilter);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [showResults, fromDate, toDate, statusFilter, fetchWorkOrdersForRange]);

  // -----------------------------------
  // RESET
  // -----------------------------------
  const resetFilters = () => {
    setStatusFilter("All");
    setColumnFilters({
      workorder: "",
      category: "",
      region: "",
      status: "",
      requestedTime: "",
      createdAt: "",
      sla: "",
      assignmentType: "",
      contractor: "",
    });
    // ✅ Reset now falls back to "today" instead of a blank state
    handleQuickFilter("today");
  };

  // -----------------------------------
  // STATUS CLASS
  // -----------------------------------
  const statusToClass = (status) => {
    const s = (status || "UNKNOWN").toString();
    return `status-${s.toLowerCase().replace(/\s+/g, "-")}`;
  };

  const parseDateSafe = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatSlaDuration = (requestedTimeClose) => {
    const requested = parseDateSafe(requestedTimeClose);

    if (!requested) {
      return { text: "N/A", breached: false };
    }

    const now = new Date();
    const diffMs = requested.getTime() - now.getTime();
    const breached = diffMs <= 0;

    let totalMinutes = Math.floor(Math.abs(diffMs) / 60000);

    const days = Math.floor(totalMinutes / 1440);
    totalMinutes %= 1440;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const parts = [];

    if (days > 0) {
      parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    }

    if (days > 0 || hours > 0) {
      parts.push(`${hours} hr${hours !== 1 ? "s" : ""}`);
    }

    parts.push(`${minutes} min${minutes !== 1 ? "s" : ""}`);

    return {
      text: `${breached ? "-" : ""}${parts.join(" ")}`,
      breached,
    };
  };

  // -----------------------------------
  // FORMAT DATE
  // -----------------------------------
  const formatDate = (val) => {
    if (!val) return "N/A";

    try {
      const d = new Date(val);

      if (isNaN(d)) return val;

      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return val;
    }
  };

  // -----------------------------------
  // FETCH SINGLE WORKORDER DETAILS
  // -----------------------------------
  const handleWorkorderClick = async (wo) => {
    try {
      setDetailsLoading(true);
      setWithdrawReason("");
      setCustomReason("");

      const res = await apiPost(
        "/api/admin/workorders/provider/workorders/assigned",
        { workorder_id: wo.workorder }
      );

      const detailData = res?.[0] || null;

      if (detailData && !detailData.status) {
        detailData.status = wo.status;
      }

      setDetails(detailData);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to fetch details:", err);
      setModalMessage("❌ Failed to fetch workorder details.");
      setShowModal(true);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openWithdrawPopup = (wo) => {
    console.log("Withdraw clicked", wo);
    setSelectedWO(wo);
    setWithdrawReason("");
    setShowWithdrawModal(true);
  };

  const submitWithdraw = async () => {
    const finalReason =
      withdrawReason === "Other" ? customReason : withdrawReason;

    if (!finalReason.trim()) {
      alert("Please select a reason");
      return;
    }

    try {
      await apiPost(
        `/api/admin/workorders/withdraw/${details.workorder}`,
        { reason: finalReason }
      );

      alert("Workorder withdrawn successfully");
      setShowDetailsModal(false);
      fetchWorkOrdersForRange(fromDate, toDate, statusFilter);
    } catch (err) {
      alert(err.message);
    }
  };

  // -----------------------------------
  // ✅ NEW: COLUMN FILTER HANDLERafeasgasdg
  // -----------------------------------
  const handleColumnFilterChange = (e) => {
    const { name, value } = e.target;
    setColumnFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  // -----------------------------------
  // ✅ NEW: APPLY COLUMN FILTERS (before pagination)
  // -----------------------------------
  const filteredWorkorders = workorders.filter((wo) => {
    const status = wo.status || "UNKNOWN";
    const { text: slaText } = formatSlaDuration(wo.requested_time_close);

    const workorderMatch = (wo.workorder || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.workorder.toLowerCase());

    const categoryMatch = (wo.category_name || wo.category || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.category.toLowerCase());

    const regionMatch = (wo.region_name || wo.region || "")
      .toString()
      .toLowerCase()
      .includes(columnFilters.region.toLowerCase());

    const statusMatch = status
      .toString()
      .toLowerCase()
      .includes(columnFilters.status.toLowerCase());

    const requestedTimeMatch = formatDate(wo.requested_time_close)
      .toString()
      .toLowerCase()
      .includes(columnFilters.requestedTime.toLowerCase());

    const createdAtMatch = formatDate(wo.created_t)
      .toString()
      .toLowerCase()
      .includes(columnFilters.createdAt.toLowerCase());

    const slaMatch = slaText
      .toString()
      .toLowerCase()
      .includes(columnFilters.sla.toLowerCase());

    const assignmentTypeMatch = (wo.ticket_assignment_type || "N/A")
      .toString()
      .toLowerCase()
      .includes(columnFilters.assignmentType.toLowerCase());

    const contractorMatch = (wo.company_name || wo.contractor_name || "Not Assigned")
      .toString()
      .toLowerCase()
      .includes(columnFilters.contractor.toLowerCase());

    return (
      workorderMatch &&
      categoryMatch &&
      regionMatch &&
      statusMatch &&
      requestedTimeMatch &&
      createdAtMatch &&
      slaMatch &&
      assignmentTypeMatch &&
      contractorMatch
    );
  });

  // -----------------------------------
  // PAGINATION DERIVED DATA (now from filteredWorkorders)
  // -----------------------------------
  const totalPages = Math.ceil(filteredWorkorders.length / itemsPerPage);
  const paginatedWorkorders = filteredWorkorders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="workorders-page">
      {/* ========================================= */}
      {/* DASHBOARD FILTER SECTION */}
      {/* ========================================= */}
      <div className="dashboard-card">
        <div className="dashboard-header">
          WORK ORDERS DASHBOARD
        </div>

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
                min="2000-01-01"
                max="2099-12-31"
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
                min="2000-01-01"
                max="2099-12-31"
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActiveQuickFilter("custom");
                }}
              />
            </div>

            <div>
              <label>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="OPEN">OPEN</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div className="dashboard-btn-group">
              <button
                className="btn btn-green"
                onClick={handleSubmitClick}
              >
                🔍 Submit
              </button>

              <button
                className="btn btn-blue"
                onClick={resetFilters}
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {loading && (
            <div className="info-message">Loading workorders...</div>
          )}

          {error && (
            <div className="error-message">Error: {error}</div>
          )}

          {/* POPUP */}
          {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <p>{modalMessage}</p>
                <button
                  className="modal-btn"
                  onClick={() => setShowModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* WORKORDER RESULTS TABLE */}
      {/* ========================================= */}
      {showResults && (
        <div className="results-main clean-results">
          <div className="results-content">

            {workorders.length > 0 ? (
              <div className="table-wrapper">
                <table className="workorders-table">
                  <thead>
                    <tr>
                      <th>Work Order</th>
                      <th>Category</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Requested Time</th>
                      <th>Created At</th>
                      <th>SLA (Hours)</th>
                      <th>Assignment Type</th>
                      <th>Contractor</th>
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
                          name="createdAt"
                          placeholder="Filter..."
                          value={columnFilters.createdAt}
                          onChange={handleColumnFilterChange}
                          className="wo-filter-input"
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          name="sla"
                          placeholder="Filter..."
                          value={columnFilters.sla}
                          onChange={handleColumnFilterChange}
                          className="wo-filter-input"
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          name="assignmentType"
                          placeholder="Filter..."
                          value={columnFilters.assignmentType}
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
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedWorkorders.length > 0 ? (
                      paginatedWorkorders.map((wo) => {
                        const status = wo.status || "UNKNOWN";
                        const isClosed =
                          (status || "").toString().toUpperCase() === "CLOSED";

                        const { text: slaText, breached: isSlaBreached } =
                          formatSlaDuration(wo.requested_time_close);

                        return (
                          <tr
                            key={wo.id}
                            className={`
                              ${statusToClass(status)}
                              ${!isClosed && isSlaBreached ? "sla-breach-row" : ""}
                            `}
                          >
                            <td
                              className="workorder-link"
                              onClick={() => handleWorkorderClick(wo)}
                            >
                              {wo.workorder}
                            </td>

                            <td>{wo.category_name || wo.category || "—"}</td>

                            <td>{wo.region_name || wo.region || "—"}</td>

                            <td className={`status ${status.toLowerCase()}`}>
                              {status}
                            </td>

                            <td>{formatDate(wo.requested_time_close)}</td>

                            <td>{formatDate(wo.created_t)}</td>

                            <td>{slaText}</td>

                            <td>{wo.ticket_assignment_type || "N/A"}</td>

                            <td>{wo.company_name || wo.contractor_name || "Not Assigned"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-3">
                          No matching records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* ========================================= */}
                {/* PAGINATION */}
                {/* ========================================= */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-3">
                    <ul className="pagination">
                      {Array.from(
                        { length: totalPages },
                        (_, index) => {
                          const pageNumber = index + 1;
                          return (
                            <li
                              key={pageNumber}
                              className={`page-item ${
                                currentPage === pageNumber ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(pageNumber)}
                              >
                                {pageNumber}
                              </button>
                            </li>
                          );
                        }
                      )}
                    </ul>
                  </div>
                )}

              </div>
            ) : (
              <div className="info-message">
                No work orders to display.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* WORKORDER DETAILS MODAL */}
      {/* ========================================= */}
      {showDetailsModal && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">

            <span
              className="modal-close-icon"
              onClick={() => {
                setShowDetailsModal(false);
                setDetails(null);
              }}
            >
              ×
            </span>

            <h2>Workorder Details</h2>

            {detailsLoading ? (
              <p className="text-center">Loading...</p>
            ) : details ? (
              <>
                <div className="kv-grid">

                  <div className="kv-row">
                    <span className="kv-label">Work Order</span>
                    <span className="kv-value">{details.workorder}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">Region</span>
                    <span className="kv-value">{details.region_name}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">State</span>
                    <span className="kv-value">{details.state_name}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">City</span>
                    <span className="kv-value">{details.city_name}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">Client</span>
                    <span className="kv-value">{details.client}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">Work Category</span>
                    <span className="kv-value">{details.category_name}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">Work Item</span>
                    <span className="kv-value">{details.item_name}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">Work Type</span>
                    <span className="kv-value">{details.type_name}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">Work Description</span>
                    <span className="kv-value">{details.description_name}</span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">Remarks</span>
                    <span className="kv-value">{details.remarks}</span>
                  </div>

                  {details.detailed_description && (
                    <div className="kv-row">
                      <span className="kv-label">Detailed Description</span>
                      <span className="kv-value">{details.detailed_description}</span>
                    </div>
                  )}

                  <div className="kv-row">
                    <span className="kv-label">Requested Close</span>
                    <span className="kv-value">
                      {formatDate(details.requested_time_close)}
                    </span>
                  </div>

                  {/* ========================================= */}
                  {/* WITHDRAW SECTION                          */}
                  {/* Shown ONLY when status === "ACCEPTED"     */}
                  {/* ========================================= */}
                  {canWithdraw(details.status) && (
                    <>
                      <div className="kv-row">
                        <span className="kv-label">Withdraw Reason</span>
                        <span className="kv-value">
                          <select
                            value={withdrawReason}
                            onChange={(e) => setWithdrawReason(e.target.value)}
                            style={{ width: "100%", padding: "8px" }}
                          >
                            <option value="">Select Reason</option>
                            {withdrawReasons.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </span>
                      </div>

                      {withdrawReason === "Other" && (
                        <div className="kv-row">
                          <span className="kv-label">Remarks</span>
                          <span className="kv-value">
                            <textarea
                              rows="3"
                              placeholder="Enter reason"
                              value={customReason}
                              onChange={(e) => setCustomReason(e.target.value)}
                              style={{ width: "100%", padding: "8px" }}
                            />
                          </span>
                        </div>
                      )}

                      <div className="kv-row">
                        <span className="kv-label"></span>
                        <span className="kv-value">
                          <button
                            className="btn btn-danger"
                            onClick={submitWithdraw}
                          >
                            Withdraw Work Order
                          </button>
                        </span>
                      </div>
                    </>
                  )}

                </div>
              </>
            ) : (
              <p>No details found.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkOrders;