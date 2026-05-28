// ==============================================
// src/pages/admin/WorkOrders.jsx
// FULL UPDATED CODE
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

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [previewMedia, setPreviewMedia] = useState(null);




  // -----------------------------------
  // FETCH FILTERED WORKORDERS
  // -----------------------------------
 const fetchFilteredWorkOrders = useCallback(async () => {
  if (!fromDate || !toDate) {
    setModalMessage("⚠️ Please select both From Date and To Date.");
    setShowModal(true);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append("from", fromDate);
    params.append("to", toDate);

    if (statusFilter !== "All") {
      params.append("status", statusFilter);
    }

    const data = await apiGet(`/api/workorders/filter?${params.toString()}`);

    if (!Array.isArray(data) || data.length === 0) {
      setModalMessage("📭 No workorders found for the selected filters.");
      setShowModal(true);
      setShowResults(false);
      setWorkorders([]);
    } else {
      setWorkorders(data);
      setShowResults(true);
    }
  } catch (err) {
    setError(err.message || String(err));
  } finally {
    setLoading(false);
  }
}, [fromDate, toDate, statusFilter]);

  useEffect(() => {
  if (!showResults || !fromDate || !toDate) return;

  const intervalId = setInterval(() => {
    fetchFilteredWorkOrders();
  }, 60000); // refresh every 60 seconds

  return () => clearInterval(intervalId);
}, [showResults, fromDate, toDate, statusFilter, fetchFilteredWorkOrders]);

  // -----------------------------------
  // RESET
  // -----------------------------------
  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("All");
    setWorkorders([]);
    setShowResults(false);
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

  // current system/live time
  const now = new Date();

  // SLA = requested close time - current time
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

      const res = await apiPost(
        "/api/workorders/provider/workorders/assigned",
        {
          workorder_id: wo.workorder,
        }
      );

      setDetails(res?.[0] || null);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to fetch details:", err);

      setModalMessage("❌ Failed to fetch workorder details.");
      setShowModal(true);
    } finally {
      setDetailsLoading(false);
    }
  };

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
          <div className="dashboard-filters">

            <div>
              <label>From Date:</label>
              <input
                type="date"
                value={fromDate}
                min="2000-01-01"
                max="2099-12-31"
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
              />
            </div>

            <div>
              <label>To Date:</label>
              <input
                type="date"
                value={toDate}
                min="2000-01-01"
                max="2099-12-31"
                onChange={(e) =>
                  setToDate(e.target.value)
                }
              />
            </div>

            <div>
              <label>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
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
                onClick={fetchFilteredWorkOrders}
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
            <div className="info-message">
              Loading workorders...
            </div>
          )}

          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}

          {/* POPUP */}
          {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <p>{modalMessage}</p>
                <button
                  className="modal-btn"
                  onClick={() =>
                    setShowModal(false)
                  }
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
                      <th>Contractor_Name</th>
                    </tr>
                  </thead>

                  <tbody>
{workorders.map((wo) => {
  const status = wo.status || "UNKNOWN";
   const isClosed =
    (status || "").toString().toUpperCase() === "CLOSED";

  // =====================================
  // SLA CALCULATION
  // =====================================
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
                            onClick={() =>
                              handleWorkorderClick(wo)
                            }
                          >
                            {wo.workorder}
                          </td>

                          <td>
                            {wo.category_name ||
                              wo.category ||
                              "—"}
                          </td>

                          <td>
                            {wo.region_name ||
                              wo.region ||
                              "—"}
                          </td>

                          <td
                            className={`status ${status.toLowerCase()}`}
                          >
                            {status}
                          </td>

                          <td>
                            {formatDate(
                              wo.requested_time_close
                            )}
                          </td>

                         

                          <td>
                            {formatDate(
                              wo.created_t
                            )}
                          </td>

                          <td>
  {slaText}
</td>
                           <td>
                            {wo.ticket_assignment_type|| "N/A"}
                          </td>
                          <td>{wo.contractor_name || "Not Assigned"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
              <p className="text-center">
                Loading...
              </p>
            ) : details ? (
              <>
                <div className="kv-grid">

                  <div className="kv-row">
                    <span className="kv-label">
                      Work Order
                    </span>
                    <span className="kv-value">
                      {details.workorder}
                    </span>
                  </div>

                 
                  

                  <div className="kv-row">
                    <span className="kv-label">
                      Region
                    </span>
                    <span className="kv-value">
                      {details.region_name}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      State
                    </span>
                    <span className="kv-value">
                      {details.state_name}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      City
                    </span>
                    <span className="kv-value">
                      {details.city_name}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      Client
                    </span>
                    <span className="kv-value">
                      {details.client}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      Work Category
                    </span>
                    <span className="kv-value">
                      {details.category_name}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      Work Item
                    </span>
                    <span className="kv-value">
                      {details.item_name}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      Work Type
                    </span>
                    <span className="kv-value">
                      {details.type_name}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      Work Description
                    </span>
                    <span className="kv-value">
                      {details.description_name}
                    </span>
                  </div>

                  <div className="kv-row">
                    <span className="kv-label">
                      Remarks
                    </span>
                    <span className="kv-value">
                      {details.remarks}
                    </span>
                  </div>

                  {details.detailed_description && (
                    <div className="kv-row">
                      <span className="kv-label">
                        Detailed Description
                      </span>
                      <span className="kv-value">
                        {
                          details.detailed_description
                        }
                      </span>
                    </div>
                  )}

                  <div className="kv-row">
                    <span className="kv-label">
                      Requested Close
                    </span>
                    <span className="kv-value">
                      {formatDate(
                        details.requested_time_close
                      )}
                    </span>
                  </div>

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