import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { apiPost } from "../../api";
import "../css/WorkOrderPage.css";
import { useContractor } from "../../context/ContractorContext";
import { BASE_URL } from "../../api";


 

function CompanyWorkorders() {
  const navigate = useNavigate();
  const { contractor } = useContractor();


  const [data, setData] = useState([]);
  const [details, setDetails] = useState(null);
  const [contractorRemarks, setContractorRemarks] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedWorkorder, setSelectedWorkorder] = useState(null);
  const [selectedExpiryTime, setSelectedExpiryTime] = useState(null);

  const [activeTab, setActiveTab] = useState("ASSIGNED");
  const [openRemarks, setOpenRemarks] = useState("");
  const [openImages, setOpenImages] = useState([]);
  const [openSubmitting, setOpenSubmitting] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  

  /* =========================
     FETCH WORKORDERS
     ========================= */
useEffect(() => {
  if (!contractor) {
    console.log("🚫 Contractor not authenticated, redirecting...");
    navigate("/contractor/login");
  }
}, [contractor, navigate]);



  useEffect(() => {
    if (!contractor?.user_uid) return;
    fetchWorkorders(activeTab);
  }, [contractor, activeTab]);

  const fetchWorkorders = async (tab) => {
    try {
      let url = "/api/workorders/provider/workorders/pending";

      switch (tab) {
        case "OPEN":
          url = "/api/workorders/provider/workorders/open";
          break;

        case "COMPLETED":
          url = "/api/workorders/provider/workorders/completed";
          break;

        case "REOPEN":
          url = "/api/workorders/provider/workorders/reopen";
          break;

        case "CLOSED":
          url = "/api/workorders/provider/workorders/closed";
          break;

        default:
          url = "/api/workorders/provider/workorders/pending";
      }

      const res = await apiPost(url, {
        provider_id: contractor.user_uid,
      });

      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("❌ Failed to fetch company workorders:", err);
      setData([]);
    }
  };


  const handleImageChange = (e) => {
      const files = Array.from(e.target.files);
      setOpenImages((prev) => [...prev, ...files]);
      e.target.value = null;
    };

    const handleRemoveMedia = (index) => {
      setOpenImages((prev) => prev.filter((_, i) => i !== index));
    };

  const handleOpenSubmit = async () => {
  if (!openRemarks.trim()) {
    alert("Contractor remarks are required");
    return;
  }

  if (openImages.length === 0) {
    alert("Closing proof images are required");
    return;
  }

  try {
    setOpenSubmitting(true);

    const formData = new FormData();
    formData.append("workorder", selectedWorkorder);
    formData.append("message", openRemarks);
    formData.append("provider_id", contractor.user_uid);

    openImages.forEach((img) => {
      formData.append("images[]", img);
    });

    const res = await apiPost(
      "/api/workorders/admin-notification-close",
      formData,
      "form"
    );

    if (res?.success) {
      alert("Request submitted successfully");
      closeModal();
      fetchWorkorders(activeTab);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setOpenSubmitting(false);
  }
};
 
 
  /* =========================
     CLICK WORKORDER
     ========================= */
  const handleWorkorderClick = async (row) => {
  setShowModal(true);
  setSelectedWorkorder(
    row.WORKORDER_ID || row.workorder_id || row.workorder
  );
  setSelectedExpiryTime(row.expiry_time || null);
  setContractorRemarks("");

  if (
    activeTab === "OPEN" ||
    activeTab === "COMPLETED" ||
    activeTab === "REOPEN" ||
    activeTab === "CLOSED"
  ) {
    setDetails(row); // 👈 reuse table data
    return;
  }

  // ASSIGNED only (needs extra data)
  try {
    setLoading(true);
    const res = await apiPost(
      "/api/workorders/provider/workorders/assigned",
      { workorder_id: row.WORKORDER_ID }
    );
    setDetails(res?.[0] || null);
  } catch (err) {
    console.error("Failed to load workorder details:", err);
  } finally {
    setLoading(false);
  }
};



  const closeModal = () => {
  setShowModal(false);
  setDetails(null);
  setSelectedWorkorder(null);
  setSelectedExpiryTime(null);
  setContractorRemarks("");
  setOpenRemarks("");
  setOpenImages([]);
  setPreviewMedia(null);
};

  /* =========================
     ACCEPT / REJECT
     ========================= */
  const handleAction = async (status) => {
    if (status === "REJECTED" && !contractorRemarks.trim()) {
      alert("Remarks are required");
      return;
    }

    try {
      setSubmitting(true);

      const timestamp = Math.floor(
        new Date(selectedExpiryTime).getTime() / 1000
      );
      console.log("🧪 contractor object:", contractor);

      const payload = {
        workorder_id: selectedWorkorder,
        action: status === "ACCEPTED" ? "accept" : "reject",
        contractor_id: contractor.user_uid,   // ✅ REQUIRED
        contractor_name: contractor.company_name,     // ✅ REQUIRED
        contractor_remarks: contractorRemarks,
        timestamp,
      };


      const result = await apiPost(
        "/api/workorders/respond-workorder",
        payload
      );

      if (result?.success) {
        closeModal();
        fetchWorkorders(activeTab);
      } else {
        alert(result?.message || "Action failed");
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     JSX
     ========================= */
  return (
    <div className="container-fluid my-5 px-0">
      <div className="workorder-card mx-auto">
        <div className="workorder-header">COMPANY WORK ORDERS</div>

        <div className="workorder-inner">
          {/* TABS */}
          <div className="workorder-tabs">
            <button
              className={`tab-btn ${activeTab === "ASSIGNED" ? "active" : ""}`}
              onClick={() => setActiveTab("ASSIGNED")}
            >
              Assigned
            </button>
            <button
              className={`tab-btn ${activeTab === "OPEN" ? "active" : ""}`}
              onClick={() => setActiveTab("OPEN")}
            >
              Open
            </button>
            <button
              className={`tab-btn ${activeTab === "COMPLETED" ? "active" : ""}`}
              onClick={() => setActiveTab("COMPLETED")}
            >
              Completed
            </button>
            <button
              className={`tab-btn ${activeTab === "REOPEN" ? "active" : ""}`}
              onClick={() => setActiveTab("REOPEN")}
            >
              Reopen
            </button>

            <button
              className={`tab-btn ${activeTab === "CLOSED" ? "active" : ""}`}
              onClick={() => setActiveTab("CLOSED")}
            >
              Closed
            </button>

          </div>

          {/* TABLE */}
          {data.length === 0 ? (
            <p className="text-center text-muted py-4">
              No work orders found
            </p>
          ) : (
            <div className="workorder-table-wrapper">
              <table className="workorder-table">
                <thead>
                  <tr>
                    <th>Work Order</th>
                    <th>Status</th>
                    <th>
                      {activeTab === "COMPLETED"
                        ? "Completed At"
                        : activeTab === "CLOSED"
                        ? "Closed At"
                        : activeTab === "REOPEN"
                        ? "Reopened At"
                        : "Assigned At"}
                    </th>

                   <th>
                      {activeTab === "OPEN"
                        ? "Requested Close"
                        : activeTab === "COMPLETED"
                        ? "Requested Close"
                        : activeTab === "REOPEN"
                        ? "Admin Remarks"
                        : activeTab === "CLOSED"
                        ? "Closed Time"
                        : "Expiry Time"}
                    </th>

                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={`${row.WORKORDER_ID || row.workorder_id}-${idx}`}>
                      <td
                        className="workorder-link"
                        onClick={() => handleWorkorderClick(row)}
                      >
                        {row.WORKORDER_ID ||
                          row.workorder_id ||
                          row.workorder}
                      </td>
                      <td>{row.assignment_status || row.status}</td>
                      <td>
                        {activeTab === "COMPLETED"
                          ? row.workorder_completed_time
                          : activeTab === "CLOSED"
                          ? row.workorder_close_time
                          : activeTab === "REOPEN"
                          ? row.workorder_reopen_time
                          : row.assigned_at}
                      </td>
                      <td>
                        {activeTab === "OPEN"
                          ? row.requested_time_close
                          : activeTab === "COMPLETED"
                          ? row.requested_time_close
                          : activeTab === "REOPEN"
                          ? row.admin_remarks
                          : activeTab === "CLOSED"
                          ? row.workorder_close_time
                          : row.expiry_time}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <span className="modal-close" onClick={closeModal}>×</span>

            <div className="modal-header">Work Order Details</div>

            {loading ? (
              <p className="text-center">Loading...</p>
            ) : details ? (
              <>
                <div className="kv-grid">
                  <div className="kv-row">
                    <span className="kv-label">Work Order</span>
                    <span className="kv-value">{selectedWorkorder}</span>
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
    <span className="kv-value">
      {details.detailed_description}
    </span>
  </div>
)}
                  {activeTab === "COMPLETED" && details.workorder_completed_time && (
                    <div className="kv-row">
                      <span className="kv-label">Work Order Completed</span>
                      <span className="kv-value">
                        {details.workorder_completed_time}
                      </span>
                    </div>
                  )}
                
                  {activeTab === "OPEN" && details.requested_time_close && (
                    <div className="kv-row">
                      <span className="kv-label">Requested Close</span>
                      <span className="kv-value">
                        {details.requested_time_close}
                      </span>
                    </div>
                  )}
                  </div>
                  {(activeTab === "COMPLETED" || activeTab === "CLOSED") &&
                    details.closing_images &&
                    details.closing_images.length > 0 && (
                      <div className="kv-row">
                        <span className="kv-label">Closing Proof</span>
                        <span className="kv-value">
                          <div className="media-preview-grid">
                            {details.closing_images.map((url, index) => {
                              const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                              const fullUrl = `${BASE_URL}${url}`; // ✅ THIS IS THE FIX

                              return (
                                <div key={index} className="media-preview-item">
                                  {isVideo ? (
                                    <video src={fullUrl} controls />
                                  ) : (
                                    <img src={fullUrl} alt="proof" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </span>
                      </div>
                  )}


               {activeTab === "ASSIGNED" &&
                  details.creation_time_image &&
                  details.creation_time_image.length > 0 && (
                    <div className="kv-row">
                      <span className="kv-label">Uploaded Images</span>
                      <span className="kv-value">
                        <div className="media-preview-grid">
                          {details.creation_time_image.map((url, index) => {
                            const isVideo = url.match(/\.(mp4|webm|ogg|mov|avi)$/i);
                            const fullUrl = `${BASE_URL}${url}`;

                            return (
                              <div
                                key={index}
                                className="media-preview-item clickable"
                                onClick={() => setPreviewMedia({ url: fullUrl, isVideo })}
                              >
                                {isVideo ? (
                                  <video src={fullUrl} controls className="media-preview" />
                                ) : (
                                  <img src={fullUrl} alt="uploaded" className="media-preview" />
                                )}

                                <a
                                  href={fullUrl}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  className="download-btn"
                                >
                                  ⬇
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </span>
                    </div>
                )}

                {activeTab === "ASSIGNED" && (
                  <>
                    <div className="contractor-remarks">
                      <label>Company Remarks</label>
                      <textarea
                        rows="3"
                        value={contractorRemarks}
                        onChange={(e) =>
                          setContractorRemarks(e.target.value)
                        }
                      />
                    </div>

                    <div className="modal-footer actions">
                      <button
                        className="btn-reject"
                        disabled={submitting}
                        onClick={() => handleAction("REJECTED")}
                      >
                        Reject
                      </button>
                      <button
                        className="btn-accept"
                        disabled={submitting}
                        onClick={() => handleAction("ACCEPTED")}
                      >
                        Accept
                      </button>
                    </div>
                  </>
                )}

                {(activeTab === "OPEN" || activeTab === "REOPEN") && (
                  <>
                    <div className="contractor-remarks">
                      <label>
                        {activeTab === "REOPEN"
                          ? "Re-upload Images"
                          : "Upload Images (for closing proof)"}
                      </label>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleImageChange}
                      />

                      {openImages.length > 0 && (
                        <div className="media-preview-grid">
                          {openImages.map((file, index) => {
                            const isVideo = file.type.startsWith("video/");
                            const previewUrl = URL.createObjectURL(file);

                            return (
                              <div key={index} className="media-preview-item">
                                {isVideo ? (
                                  <video src={previewUrl} controls />
                                ) : (
                                  <img src={previewUrl} alt="preview" />
                                )}

                                <button
                                  type="button"
                                  className="remove-media-btn"
                                  onClick={() => handleRemoveMedia(index)}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>

                    <div className="contractor-remarks">
                      <label>
                        {activeTab === "REOPEN"
                          ? "Contractor Reopen Remarks"
                          : "Contractor Remarks"}
                      </label>
                      <textarea
                        rows="3"
                        value={openRemarks}
                        onChange={(e) => setOpenRemarks(e.target.value)}
                      />
                    </div>

                    <div className="modal-footer actions">
                      <button
                        className="btn-accept"
                        disabled={openSubmitting}
                        onClick={handleOpenSubmit}
                      >
                        Submit
                      </button>
                    </div>
                  </>
                )}

              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyWorkorders;