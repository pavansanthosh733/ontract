// src/pages/Contractor.jsx
import React, { useEffect, useState } from "react";
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

  const navigate = useNavigate();

  /* ================= FETCH WORKORDERS ================= */
  const fetchWorkOrders = async () => {
    try {
      const data = await apiGet("/api/workorders/");

      const filtered = data.filter(
        (wo) => (wo.STATUS || wo.status || "").toLowerCase() !== "accepted"
      );

      setWorkorders(filtered);
      setFilteredOrders(filtered);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  /* ================= FILTER SUBMIT ================= */
  const handleSubmit = () => {
    let filtered = [...workorders];

    if (fromDate) {
      filtered = filtered.filter(
        (wo) => new Date(wo.created_t) >= new Date(fromDate)
      );
    }

    if (toDate) {
      filtered = filtered.filter(
        (wo) => new Date(wo.created_t) <= new Date(toDate + "T23:59:59")
      );
    }

    if (status !== "All") {
      filtered = filtered.filter(
        (wo) =>
          (wo.status || wo.STATUS || "").toLowerCase() ===
          status.toLowerCase()
      );
    }

    setFilteredOrders(filtered);
  };

  /* ================= RESET ================= */
  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setStatus("All");
    setFilteredOrders(workorders);
  };

  if (loading) return <div className="center">Loading...</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="workorders-fullpage-container">
      <div className="workorders-content">
        <h2>WORK ORDERS DASHBOARD</h2>

        {/* ================= FILTER SECTION ================= */}
        <div className="filters-container">
          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>To Date:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
             <option value="All">All</option>
                <option value="OPEN">OPEN</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CLOSED">CLOSED</option>
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
            </thead>

            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No workorders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((wo) => (
                  <tr key={wo.workorder}>
                    <td
                      onClick={() =>
                        navigate(
                          `/admin/workorder/contractor/workorders/${wo.workorder}`
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