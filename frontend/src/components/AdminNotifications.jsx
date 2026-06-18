import React, { useState, useEffect } from "react";
import { apiGet, apiPost, BASE_URL } from "../api";
import "./css/AdminNotification.css";
import { useNavigate } from "react-router-dom";

function AdminNotifications() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [details, setDetails] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [selectedWorkorder, setSelectedWorkorder] = useState(null);
  const [selectedContractors, setSelectedContractors] = useState([]);
  const [activeTab, setActiveTab] = useState("ASSIGNED");

  const [adminRemarks, setAdminRemarks] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  /* =========================================================
     TOGGLE CONTRACTOR
  ========================================================= */
  const toggleContractorSelection = (userUid) => {
    setSelectedContractors((prev) =>
      prev.includes(userUid)
        ? prev.filter((id) => id !== userUid)
        : [...prev, userUid]
    );
  };

  /* =========================================================
     FETCH WORKORDERS
  ========================================================= */
  const fetchWorkorders = async (tab) => {
    try {
      let res = [];

      if (tab === "ASSIGNED") {
        res = await apiGet("/api/workorders/admin/notifications/assigned");
      } else if (tab === "OPEN") {
        res = await apiGet("/api/workorders/admin/notifications/close");
      } else if (tab === "COMPLETED") {
        res = await apiGet("/api/workorders/admin/notifications/invoice");
      } else if (tab === "OVERRATED") {
        res = await apiGet("/api/workorders/admin/notifications/overrated");
      }

      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Fetch failed:", err);
      setData([]);
    }
  };

  useEffect(() => {
    fetchWorkorders(activeTab);
    setSelectedContractors([]);
  }, [activeTab]);

  /* =========================================================
     HANDLE WORKORDER CLICK
  ========================================================= */
  const handleWorkorderClick = async (row) => {
    const workorderId =
      row.WORKORDER_ID || row.workorder_id || row.workorder;

    setShowModal(true);
    setSelectedWorkorder(workorderId);
    setSelectedContractors([]);
    setDetails([]);
    setAdminRemarks("");

    try {
      setLoading(true);

      if (activeTab === "ASSIGNED") {
        const res = await apiGet(
          `/api/workorders/admin/notifications/contractorlist?workorder_id=${workorderId}`
        );
        setDetails(res?.data || []);
      }

      else if (activeTab === "OPEN") {
        const res = await apiGet(
          `/api/workorders/admin/notifications/completed_workorder?workorder_id=${workorderId}`
        );
        setDetails(res || []);
      }

      else if (activeTab === "OVERRATED") {
        const res = await apiGet(
          `/api/workorders/admin/notifications/overrated/details?workorder_id=${workorderId}`
        );

        if (res?.data) {
          setDetails([res.data]);
        } else {
          setDetails([]);
        }
      }

      else {
        setDetails([row]);
      }

    } catch (err) {
      console.error(err);
      setDetails([]);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CLOSE WORKORDER
  ========================================================= */
  const handleCloseWorkorder = async () => {
    if (!adminRemarks.trim()) {
      alert("Admin remarks are required");
      return;
    }

    try {
      setAdminSubmitting(true);

      await apiPost("/api/workorders/admin/close", {
        workorder: selectedWorkorder,
        remarks: adminRemarks,
      });

      alert("✅ Workorder closed successfully");
      closeModal();
      fetchWorkorders(activeTab);

    } catch (err) {
      console.error(err);
      alert("❌ Failed to close workorder");
    } finally {
      setAdminSubmitting(false);
    }
  };

  /* =========================================================
     REOPEN WORKORDER
  ========================================================= */
  const handleReopenWorkorder = async () => {
    if (!adminRemarks.trim()) {
      alert("Admin remarks are required");
      return;
    }

    try {
      setAdminSubmitting(true);

      await apiPost("/api/workorders/admin/reopen", {
        workorder: selectedWorkorder,
        remarks: adminRemarks,
      });

      alert("✅ Workorder reopened successfully");
      closeModal();
      fetchWorkorders(activeTab);

    } catch (err) {
      console.error(err);
      alert("❌ Failed to reopen workorder");
    } finally {
      setAdminSubmitting(false);
    }
  };

  /* =========================================================
     ASSIGN CONTRACTOR
  ========================================================= */
  const handleAssignContractor = async () => {
    if (selectedContractors.length === 0) {
      alert("Please select at least one contractor");
      return;
    }

    try {
      setAssigning(true);

      const selectedData = details.filter((c) =>
        selectedContractors.includes(c.user_uid)
      );

      await apiPost("/api/workorders/send-email-acceptence", {
        workorder: selectedWorkorder,
        contractors: selectedData,
      });

      alert("✅ Acceptance email sent successfully");
      closeModal();

    } catch (err) {
      console.error(err);
      alert("❌ Failed to send acceptance email");
    } finally {
      setAssigning(false);
    }
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */
  const closeModal = () => {
    setShowModal(false);
    setDetails([]);
    setSelectedWorkorder(null);
    setSelectedContractors([]);
    setAdminRemarks("");
  };

  /* =========================================================
     JSX
  ========================================================= */
  return (
    <div className="container-fluid my-5 px-0">
      <div className="workorder-card mx-auto">

        <div className="workorder-header">
          Admin Notifications
        </div>

        <div className="workorder-inner">

          {/* =========================================================
             TABS
          ========================================================= */}
          <div className="workorder-tabs">

            <button
              className={`tab-btn ${activeTab === "ASSIGNED" ? "active" : ""}`}
              onClick={() => setActiveTab("ASSIGNED")}
            >
              WorkOrder Assignment Notifications
            </button>

            <button
              className={`tab-btn ${activeTab === "OPEN" ? "active" : ""}`}
              onClick={() => setActiveTab("OPEN")}
            >
              Completed Notifications
            </button>

            <button
              className={`tab-btn ${activeTab === "OVERRATED" ? "active" : ""}`}
              onClick={() => setActiveTab("OVERRATED")}
            >
              Overrated Notifications
            </button>

          </div>

          {/* =========================================================
             TABLE
          ========================================================= */}
          {data.length === 0 ? (
            <p className="text-center text-muted py-4">
              No records found
            </p>
          ) : (
            <div className="workorder-table-wrapper">
              <table className="workorder-table">
                <thead>
                  <tr>
                    <th>Work Order</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((row, index) => (
                    <tr key={index}>

                      <td
                        className="workorder-link"
                        onClick={() => handleWorkorderClick(row)}
                      >
                        {row.WORKORDER_ID ||
                          row.workorder_id ||
                          row.workorder}
                      </td>

                      <td>
                        {row.notification_type || row.status}
                      </td>

                      <td>
                        {row.created_at || row.assigned_at}
                      </td>

                      <td className="remarks-cell">
                        {row.message || row.remarks}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* =========================================================
         MODAL
      ========================================================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-xl">

            <span
              className="modal-close"
              onClick={closeModal}
            >
              ×
            </span>

            {/* =========================================================
               ASSIGNED TAB
            ========================================================= */}
            {activeTab === "ASSIGNED" && (
              <>
                <div className="modal-header">
                  Contractors for Work Order {selectedWorkorder}
                </div>

                {loading ? (
                  <p className="text-center">
                    Loading...
                  </p>
                ) : (
                  <>
                    <div className="workorder-table-wrapper">
                      <div className="horizontal-scroll">
                        <table className="workorder-table full-width-table">

                          <thead>
                            <tr>
                              <th>Select</th>
                              <th>Contractor Name</th>
                              <th>Email</th>
                              <th>Location</th>
                              <th>Service Rate</th>
                            </tr>
                          </thead>

                          <tbody>
                            {details.map((c, idx) => (
                              <tr key={idx}>

                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedContractors.includes(c.user_uid)}
                                    onChange={() =>
                                      toggleContractorSelection(c.user_uid)
                                    }
                                  />
                                </td>

                                <td>{c.name}</td>
                                <td>{c.email_id}</td>
                                <td>{c.city}, {c.state}</td>
                                <td>₹ {c.rate}</td>

                              </tr>
                            ))}
                          </tbody>

                        </table>
                      </div>
                    </div>

                    <div className="text-end mt-3">
                      <button
                        className="btn btn-primary"
                        disabled={
                          selectedContractors.length === 0 || assigning
                        }
                        onClick={handleAssignContractor}
                      >
                        {assigning
                          ? "Assigning..."
                          : "Assign Contractor"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* =========================================================
               OPEN TAB
            ========================================================= */}
            {activeTab === "OPEN" && details.length > 0 && (
              <>
                <div className="modal-header">
                  Work Order Details
                </div>

                <div className="kv-grid">

                  {[
                    ["Work Order", details[0].workorder],
                    ["Region", details[0].region_name],
                    ["State", details[0].state_name],
                    ["City", details[0].city_name],
                    ["Client", details[0].client],
                    ["Work Category", details[0].category_name],
                    ["Work Item", details[0].item_name],
                    ["Work Type", details[0].type_name],
                    ["Description", details[0].description_name],

                    ...(details[0].detailed_description
                      ? [["Detailed Description", details[0].detailed_description]]
                      : []),

                    ["Remarks", details[0].remarks],
                    ["Completed At", details[0].workorder_completed_time],

                  ].map(([k, v], i) => (
                    <div className="kv-row" key={i}>
                      <span className="kv-label">{k}</span>
                      <span className="kv-value">
                        {v || "-"}
                      </span>
                    </div>
                  ))}

                  {/* =========================================================
                     CLOSING PROOF
                     BUTTON ONLY
                  ========================================================= */}
                  {details[0].closing_images?.length > 0 && (
                    <div className="kv-row">
                      <span className="kv-label">
                        Closing Proof
                      </span>

                      <span className="kv-value">
                        <div className="proof-links-only">

                          {details[0].closing_images.map((url, i) => {
                            const fullUrl = `${BASE_URL}${url}`;

                            return (
                              <button
                                key={i}
                                type="button"
                                className="open-btn"
                                onClick={() =>
                                  window.open(fullUrl, "_blank")
                                }
                              >
                                Click Here to View image
                              </button>
                            );
                          })}

                        </div>
                      </span>
                    </div>
                  )}

                  {/* =========================================================
                     ADMIN REMARKS
                  ========================================================= */}
                  <div className="remarks-section">

                    <label className="remarks-label">
                      Admin Remarks
                    </label>

                    <textarea
                      className="remarks-textarea"
                      rows="4"
                      placeholder="Enter admin remarks..."
                      value={adminRemarks}
                      onChange={(e) =>
                        setAdminRemarks(e.target.value)
                      }
                    />

                    <div className="remarks-actions">

                      <button
                        className="btn-reject"
                        disabled={adminSubmitting}
                        onClick={handleReopenWorkorder}
                      >
                        Reopen Workorder
                      </button>

                      <button
                        className="btn-accept"
                        disabled={adminSubmitting}
                        onClick={handleCloseWorkorder}
                      >
                        Close Workorder
                      </button>

                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNotifications;