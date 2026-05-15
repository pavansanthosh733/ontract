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
      const data = await apiGet(`/api/workorders/search?query=${searchTerm}`);

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
  // 🔴 CLOSE WORKORDER
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
                <div>Category</div>
              </div>
              <div className="wo-value-row">
                <div>{workorder.workorder}</div>
                <div>{workorder.region_name}</div>
                <div>{workorder.category_name}</div>
              </div>
            </div>

            <div className="wo-header-row">
              <div>Requested Time Closing</div>
              <div>Remarks</div>
              <div>Client</div>
            </div>
            <div className="wo-value-row">
              <div>
                {workorder.requested_time_close
                  ? new Date(workorder.requested_time_close).toLocaleString()
                  : "N/A"}
              </div>
              <div>{workorder.remarks || "—"}</div>
              <div>{workorder.client || "—"}</div>
            </div>

            <div className="wo-row">
              <div className="wo-header-row">
                <div>Created At</div>
                <div>Status</div>
                <div></div>
              </div>
              <div className="wo-value-row">
                <div>
                  {workorder.created_t
                    ? new Date(workorder.created_t).toLocaleString()
                    : "N/A"}
                </div>
                <div>{workorder.status}</div>
                <div></div>
              </div>
            </div>

            {/* Contractor Info */}
            <div className="section-card no-header">
              <table className="child-table">
                <thead>
                  <tr>
                    <th>Sl. No</th>
                    <th>WorkOrder</th>
                    <th>Contractor Name</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>{workorder.workorder}</td>
                    <td>{workorder.contractor_name || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CLOSE BUTTON + IMAGE UPLOAD */}
            {["OPEN", "ACCEPTED"].includes(workorder.status?.toUpperCase()) && (
              <div className="close-section">
                <label>Upload Closing Image:</label>

                <input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    const files = Array.from(e.target.files);

    const onlyImages = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (onlyImages.length !== files.length) {
      alert("❌ ZIP or non-image files are not allowed.");
    }

    setClosingImages([
      ...closingImages,
      ...onlyImages,
    ]);
  }}
/>

                {/* Preview */}
                {closingImages.length > 0 && (
                  <div className="image-preview-list">
                    {closingImages.map((file, idx) => (
                      <div key={idx} className="image-preview-item">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="preview-thumbnail"
                        />
                        <div className="file-info">
                          <span>{file.name}</span>
                          <button
                            className="remove-btn"
                            onClick={() =>
                              setClosingImages(
                                closingImages.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="close-btn" onClick={handleCloseWorkorder}>
                  Close Workorder
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchWorkOrder;