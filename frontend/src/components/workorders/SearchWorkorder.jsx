import React, { useState } from "react";
import "./css/searchworkorders.css";

// API wrapper
import { apiGet, apiFetch } from "../../api";

const SearchWorkOrder = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [workorder, setWorkorder] = useState(null);
  const [closingImages, setClosingImages] = useState([]);
  const [error, setError] = useState("");

  // ================================
  // 🔍 SEARCH WORKORDER
  // ================================
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setWorkorder(null);
      setError("");
      return;
    }

    try {
      const data = await apiGet(`/api/admin/workorders/search?query=${searchTerm}`);

      if (!Array.isArray(data) || data.length === 0)
        throw new Error("Workorder not found");

      const exactMatch = data.find((wo) => wo.workorder === searchTerm);
      const selected = exactMatch || data[0];

      setWorkorder(selected);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  // ================================
  // 🔴 CLOSE WORKORDER fun code
  // ================================
  const handleCloseWorkorder = async () => {
    if (!workorder) return alert("No workorder selected!");

    if (closingImages.length === 0) {
      return alert("Upload at least 1 closing image.");
    }

    const formData = new FormData();
    formData.append("STATUS", "CLOSED");

    closingImages.forEach((file) => {
      formData.append("closing_images[]", file);
    });

    try {
      // *****************************
      // FIXED API URL 🚀
      // *****************************
      await apiFetch(`/api/workorders/close/${workorder.workorder}`, {
        method: "PUT",
        body: formData,
      });

      alert("✅ Workorder closed successfully!");

      setWorkorder((prev) => ({
        ...prev,
        status: "CLOSED",
      }));

      setClosingImages([]);
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  return (
    <div className="workorders-container">
      <h2 className="page-title">Search WorkOrder</h2>

      {/* SEARCH BAR */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Enter WorkOrder..."
          value={searchTerm}
          onInput={(e) => {
            e.target.value = e.target.value
              .toUpperCase()
              .replace(/[^0-9A-Z]/g, "");
            setSearchTerm(e.target.value);
          }}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* WORKORDER DETAILS */}
      {workorder && (
        <div className="section-card">
          <div className="section-header">Workorder Details</div>

          <div className="section-content">

            <div className="wo-row">
              <div className="wo-header-row">
                <div>WorkOrder</div>
                <div>Region</div>
                <div>State</div>
              </div>

              <div className="wo-value-row">
                <div>{workorder.workorder}</div>
                <div>{workorder.region_name || "-"}</div>
                <div>{workorder.state_name || "-"}</div>
              </div>
            </div>

            <div className="wo-row">
              <div className="wo-header-row">
                <div>City</div>
                <div>Category</div>
                <div>Item</div>
              </div>

              <div className="wo-value-row">
                <div>{workorder.city_name || "-"}</div>
                <div>{workorder.category_name || "-"}</div>
                <div>{workorder.item_name || "-"}</div>
              </div>
            </div>

            <div className="wo-row">
              <div className="wo-header-row">
                <div>Type</div>
                <div>Description</div>
                <div>Created At</div>
              </div>

              <div className="wo-value-row">
                <div>{workorder.type_name || "-"}</div>
                <div>{workorder.description_name || "-"}</div>
                <div>{workorder.created_t
                    ? new Date(workorder.created_t).toLocaleString()
                    : "N/A"}</div>
              </div>
            </div>

            <div className="wo-header-row">
              <div>Remarks</div>
              <div>Client</div>
              <div>Status</div>
            </div>
            <div className="wo-value-row">
              <div>{workorder.remarks || "—"}</div>
              <div>{workorder.client || "—"}</div>
              <div>{workorder.status}</div>
            </div>

            {/* WORKORDER LIFECYCLE */}
            <div className="section-card no-header">
              <h4 style={{ marginBottom: "15px" }}>
                Workorder Lifecycle
              </h4>
             <div className="lifecycle-scroll">
                <table className="child-table">
                  <thead>
                    <tr>
                      <th>Sl. No</th>
                      <th>Workorder</th>
                      <th>Status</th>
                      <th>Date & Time</th>
                      <th>Contractor</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workorder.timeline?.length > 0 ? (
                      workorder.timeline.map((item, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{workorder.workorder}</strong>
                          </td>
                          <td>
                            <strong>{item.status}</strong>
                          </td>

                          <td>
                            {item.time
                              ? new Date(item.time).toLocaleString()
                              : "-"}
                          </td>

                          <td>
                            {item.contractor_name || "-"}
                          </td>

                          <td>
                            {item.admin_remarks ||
                              item.contractor_remarks ||
                              item.remarks ||
                              "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center" }}>
                          No lifecycle records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SearchWorkOrder;