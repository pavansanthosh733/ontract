import React, { useState, useEffect } from "react";
import "./css/createregion.css";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api.js";
import Swal from "sweetalert2";

const CreateRegion = () => {
  const [formData, setFormData] = useState({
    REGION_NAME: "",
    STATUS: "Active",
  });

  const [regions, setRegions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  // ✅ Filters for Region Table
const [filters, setFilters] = useState({
  region: "",
  status: "",
});

  const [editingData, setEditingData] = useState({
    REGION_NAME: "",
    STATUS: "",
  });

  const fetchRegions = async () => {
    const data = await apiGet("/api/region/");
    setRegions(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingData((prev) => ({ ...prev, [name]: value }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      region_name: formData.REGION_NAME,
      status: formData.STATUS,
    };

    await apiPost("/api/region/", payload);

    await Swal.fire({
      icon: "success",
      title: "Success",
      text: "Region added successfully!",
      confirmButtonText: "OK",
    });

    setFormData({
      REGION_NAME: "",
      STATUS: "Active",
    });

    fetchRegions();

  } catch (error) {
    console.error("Add region error:", error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to add region",
      confirmButtonText: "OK",
    });
  }
};
  const handleEdit = (region) => {
    setEditingId(region.id);
    setEditingData({
      REGION_NAME: region.region_name,
      STATUS: region.status,
    });
  };

  const handleUpdate = async (id) => {
    const payload = {
      region_name: editingData.REGION_NAME,
      status: editingData.STATUS,
    };

    await apiPut(`/api/region/${id}`, payload);
    setEditingId(null);
    alert("region updated!");
    fetchRegions();
    
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this region?")) return;
    await apiDelete(`/api/region/${id}`);
    alert("region deleted!");
    fetchRegions();
  };

  // ✅ Handle Filter Input Change
const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters({ ...filters, [name]: value });
};

// ✅ Apply Filters
const filteredRegions = regions.filter((r) => {
  return (
    r.region_name.toLowerCase().includes(filters.region.toLowerCase()) &&
    r.status.toLowerCase().includes(filters.status.toLowerCase())
  );
});


  return (
    <div className="region-page">
      <div className="region-container">

        {/* ================= FORM BOX ================= */}
        <div className="region-box">
          <h2>Add New Region</h2>

          <form className="region-form" onSubmit={handleSubmit}>
            {/* HEADER */}
            <div className="region-header-row">
              <div className="region-header-cell">REGION NAME</div>
              <div className="region-header-cell">STATUS</div>
            </div>

            {/* REGION NAME */}
            <div className="region-form-group">
              <div className="region-input-wrapper">
                <input
                  type="text"
                  name="REGION_NAME"
                  placeholder="Enter Region Name"
                  value={formData.REGION_NAME}
              
                  onChange={handleChange}
                  required
                />
                <span className="region-star">★</span>
              </div>
            </div>

            {/* STATUS */}
            <div className="region-form-group">
              <div className="region-input-wrapper">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="region-star">★</span>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="region-actions">
              <button type="submit" className="region-btn-primary">Submit</button>
              <button type="button"
                className="region-btn-reset"
                onClick={() => setFormData({ REGION_NAME: "", STATUS: "Active" })}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* ================= TABLE BOX ================= */}
        <div className="region-box">
          <h2>Existing Regions</h2>

          <div className="region-table-wrapper">
            <div className="fixed-table">

              <table className="region-table">
<thead>
  {/* ✅ Main Header Row */}
  <tr>
    <th>Region Name</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>

  {/* ✅ Filter Row */}
  <tr>
    <th>
      <input
        type="text"
        name="region"
        placeholder="Filter region..."
        value={filters.region}
        onChange={handleFilterChange}
        className="region-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="status"
        placeholder="Filter status..."
        value={filters.status}
        onChange={handleFilterChange}
        className="region-filter-input"
      />
    </th>

    <th></th>
  </tr>
</thead>


                <tbody>
                  {filteredRegions.map((region) => (

                    <tr key={region.id}>
                      {editingId === region.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              name="REGION_NAME"
                              value={editingData.REGION_NAME}
                              disabled
                              onChange={handleEditChange}
                            />
                          </td>

                          <td>
                            <select
                              name="STATUS"
                              value={editingData.STATUS}
                              onChange={handleEditChange}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </td>

                          <td>
                            <button
                              className="region-btn-save"
                              onClick={() => handleUpdate(region.id)}
                            >
                              Save
                            </button>

                            <button
                              className="region-btn-cancel"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{region.region_name}</td>
                          <td>{region.status}</td>

                          <td>
                            <button
                              className="region-btn-edit"
                              onClick={() => handleEdit(region)}
                            style={{ marginRight: "10px" }} >
                              Edit
                              
                            </button>

                            <button
                              className="region-btn-delete"
                              onClick={() => handleDelete(region.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {regions.length === 0 && (
                    <tr>
                      <td colSpan="3">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateRegion;
