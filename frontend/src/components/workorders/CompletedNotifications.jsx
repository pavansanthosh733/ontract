import React, { useState, useEffect } from "react";
import { apiGet, apiPost, BASE_URL } from "../../api";
import "./css/completeNotification.css";
import ContractorRatingModal from "../modals/ContractorRatingModal";

function CompletedWorkOrders() {
  const [data, setData] = useState([]);
  const [details, setDetails] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedWorkorder, setSelectedWorkorder] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingWorkorderData, setRatingWorkorderData] = useState(null);

  const cleanInput = (value) => value.replace(/[^A-Za-z0-9-.& ]/g, "");

  /* =========================================================
     FETCH COMPLETED WORKORDERS (awaiting admin close/reopen)
  ========================================================= */
  const fetchWorkorders = async () => {
    try {
      const res = await apiGet("/api/admin/workorders/admin/notifications/close");
      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Fetch failed:", err);
      setData([]);
    }
  };

  useEffect(() => {
    fetchWorkorders();
  }, []);

  /* =========================================================
     HANDLE WORKORDER CLICK
  ========================================================= */
  const handleWorkorderClick = async (row) => {
    const workorderId =
      row.WORKORDER_ID || row.workorder_id || row.workorder;

    setShowModal(true);
    setSelectedWorkorder(workorderId);
    setDetails([]);
    setAdminRemarks("");

    try {
      setLoading(true);

      const res = await apiGet(
        `/api/admin/workorders/admin/notifications/completed_workorder?workorder_id=${workorderId}`
      );
      setDetails(res || []);
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

      const response = await apiPost("/api/admin/workorders/admin/close", {
        workorder: selectedWorkorder,
        remarks: adminRemarks,
      });

      alert("✅ Workorder closed successfully");

      const ratingData = {
        workorder: response?.data?.workorder || selectedWorkorder,
      };

      setRatingWorkorderData(ratingData);
      setShowModal(false);
      setShowRatingModal(true);

      fetchWorkorders();
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

      await apiPost("/api/admin/workorders/admin/reopen", {
        workorder: selectedWorkorder,
        remarks: adminRemarks,
      });

      alert("✅ Workorder reopened successfully");
      closeModal();
      fetchWorkorders();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to reopen workorder");
    } finally {
      setAdminSubmitting(false);
    }
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */
  const closeModal = () => {
    setShowModal(false);
    setDetails([]);
    setSelectedWorkorder(null);
    setAdminRemarks("");
  };

  /* =========================================================
     JSX
  ========================================================= */
  return (
    <div className="completed-workorders-page">
     <div className="workorder-card">

        <div className="workorder-header">
          Completed Work Orders
        </div>

        <div className="workorder-inner">

          {/* =========================================================
             TABLE
          ========================================================= */}
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
      {data.length === 0 ? (
        <tr>
          <td colSpan="4" className="no-records">
            No records found
          </td>
        </tr>
      ) : (
        data.map((row, index) => (
          <tr key={index}>
            <td
              className="workorder-link"
              onClick={() => handleWorkorderClick(row)}
            >
              {row.WORKORDER_ID || row.workorder_id || row.workorder}
            </td>

            <td>{row.notification_type || row.status}</td>

            <td>{row.created_at || row.assigned_at}</td>

            <td>{row.message || row.remarks}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
          

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

            {details.length > 0 && (
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
                        setAdminRemarks(cleanInput(e.target.value))
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

      <ContractorRatingModal
        show={showRatingModal}
        workorderData={ratingWorkorderData}
        onClose={() => {
          setShowRatingModal(false);
          setRatingWorkorderData(null);
        }}
        onRatingSaved={() => {
          setShowRatingModal(false);
          setRatingWorkorderData(null);
          fetchWorkorders();
        }}
      />
    </div>
  );
}

export default CompletedWorkOrders;