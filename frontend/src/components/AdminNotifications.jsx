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
     (Completed Notifications tab moved out to CompletedWorkOrders.jsx,
     accessible from the Work Orders sidebar)
  ========================================================= */
  const fetchWorkorders = async (tab) => {
    try {
      let res = [];

      if (tab === "ASSIGNED") {
        res = await apiGet("/api/admin/workorders/admin/notifications/assigned");
      } else if (tab === "OVERRATED") {
        res = await apiGet("/api/admin//workorders/admin/notifications/overrated");
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

    try {
      setLoading(true);

      if (activeTab === "ASSIGNED") {
        const res = await apiGet(
          `/api/admin/workorders/admin/notifications/contractorlist?workorder_id=${workorderId}`
        );
        setDetails(res?.data || []);
      }

      else if (activeTab === "OVERRATED") {
        const res = await apiGet(
          `/api/admin/workorders/admin/notifications/overrated/details?workorder_id=${workorderId}`
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

      await apiPost("/api/admin/workorders/send-email-acceptence", {
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
                                <td>{c.rate}</td>

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

          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNotifications;