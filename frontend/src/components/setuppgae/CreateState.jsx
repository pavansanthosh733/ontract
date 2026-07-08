import React, { useState, useEffect } from "react";
import "./css/createstate.css";   // ✅ NEW SEPARATED CSS
import { apiGet, apiPost, apiPut, apiDelete } from "../../api";
import Swal from "sweetalert2";

const CreateState = () => {
  const [formData, setFormData] = useState({
    REGION_ID: "",
    STATE_NAME: "",
    STATUS: "Active",
  });

  const [states, setStates] = useState([]);
  const [regionsList, setRegionsList] = useState([]);

  const [editingId, setEditingId] = useState(null);

  // ✅ Filters for Existing States Table
const [filters, setFilters] = useState({
  region: "",
  state: "",
  status: "",
});

  const [editingData, setEditingData] = useState({
    STATE_NAME: "",
    STATUS: "",
  });

  /* ==========================
     Fetch Regions Dropdown
  =========================== */
  const fetchRegionsList = async () => {
    try {
      const data = await apiGet("/api/admin/region/");
      setRegionsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching regions:", e);
    }
  };

  /* ==========================
     Fetch States (Joined)
  =========================== */
  const fetchStates = async () => {
    try {
      const data = await apiGet("/api/admin/state/");
      setStates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching states:", e);
    }
  };

  useEffect(() => {
    fetchRegionsList();
    fetchStates();
  }, []);

  /* ==========================
     Add Form Change
  =========================== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ==========================
     Edit Form Change
  =========================== */
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingData((prev) => ({ ...prev, [name]: value }));
  };

  /* ==========================
     Add State
  =========================== */
const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      region_id: formData.REGION_ID,
      state_name: formData.STATE_NAME,
      status: formData.STATUS,
    };

    await apiPost("/api/admin/state/", payload);

    await Swal.fire({
      icon: "success",
      title: "Success",
      text: "State added successfully!",
      confirmButtonText: "OK",
    });

    setFormData({ REGION_ID: "", STATE_NAME: "", STATUS: "Active" });
    fetchStates();
  } catch (error) {
    console.error("Add state error:", error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: error?.message || "Failed to add state",
      confirmButtonText: "OK",
    });
  }
};

  /* ==========================
     Start Editing
  =========================== */
  const handleEdit = (state) => {
    setEditingId(state.id);
    setEditingData({
      STATE_NAME: state.state_name,
      STATUS: state.status,
    });
  };

  /* ==========================
     Cancel Editing
  =========================== */
  const handleCancel = () => {
    setEditingId(null);
    setEditingData({ STATE_NAME: "", STATUS: "" });
  };

  /* ==========================
     Update State
  =========================== */
  const handleUpdate = async (id) => {
    const payload = {
      state_name: editingData.STATE_NAME,
      status: editingData.STATUS,
    };

    try {
      const res = await apiPut(`/api/admin/state/${id}`, payload);
      if (res?.error) return alert("❌ " + res.error);

      alert("✅ State updated!");
      setEditingId(null);
      fetchStates();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update state");
    }
  };

  /* ==========================
     Delete State
  =========================== */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this state?")) return;

    try {
      await apiDelete(`/api/admin/state/${id}`);
      alert("✅ State deleted!");
      fetchStates();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete");
    }
  };

  /* ==========================
     Reset Form
  =========================== */
  const handleReset = () => {
    setFormData({ REGION_ID: "", STATE_NAME: "", STATUS: "Active" });
  };
  // ✅ Handle Filter Change
const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters({ ...filters, [name]: value });
};

// ✅ Apply Filters
const filteredStates = states.filter((s) => {
  return (
    s.region_name.toLowerCase().includes(filters.region.toLowerCase()) &&
    s.state_name.toLowerCase().includes(filters.state.toLowerCase()) &&
    s.status.toLowerCase().includes(filters.status.toLowerCase())
  );
});


  return (
    <div className="state-page">
      <div className="state-container">

        {/* ================= FORM BOX ================= */}
        <div className="state-box">
          <h2>Add New State</h2>

          <form onSubmit={handleSubmit} className="state-form">

            <div className="state-header-row">
              <div>REGION NAME</div>
              <div>STATE NAME</div>
              <div>STATUS</div>
            </div>

            <div className="state-row">

              {/* REGION DROPDOWN */}
              <div className="state-input-wrapper">
                <select
                  name="REGION_ID"
                  value={formData.REGION_ID}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Region</option>
                  {regionsList.map((r) => (
                    <option key={r.id} value={r.region_id}>
                      {r.region_name}
                    </option>
                  ))}
                </select>
                <span className="state-star">★</span>
              </div>

              {/* STATE NAME */}
              <div className="state-input-wrapper">
                <input
                  type="text"
                  name="STATE_NAME"
                  placeholder="Enter State Name"
                  value={formData.STATE_NAME}
                  onChange={handleChange}
                  required
                />
                <span className="state-star">★</span>
              </div>

              {/* STATUS */}
              <div className="state-input-wrapper">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="state-star">★</span>
              </div>

            </div>

            <div className="state-actions">
              <button type="submit" className="state-btn-primary">Submit</button>
              <button type="button" className="state-btn-reset" onClick={handleReset}>
                Reset
              </button>
            </div>

          </form>
        </div>

        {/* ================= TABLE BOX ================= */}
        <div className="state-box">
          <h2>Existing States</h2>

          <div className="state-table-wrapper">
            <div className="fixed-table">
              <table className="state-table">
<thead>
  {/* ✅ Main Header Row */}
  <tr>
    <th>Region Name</th>
    <th>State Name</th>
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
        className="state-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="state"
        placeholder="Filter state..."
        value={filters.state}
        onChange={handleFilterChange}
        className="state-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="status"
        placeholder="Filter status..."
        value={filters.status}
        onChange={handleFilterChange}
        className="state-filter-input"
      />
    </th>

    <th></th>
  </tr>
</thead>


                <tbody>
                  {states.length > 0 ? (
                   filteredStates.map((state) => (

                      <tr key={state.id}>

                        {editingId === state.id ? (
                          <>
                            <td>{state.region_name}</td>

                            <td>
                              <input
                                type="text"
                                name="STATE_NAME"
                                value={editingData.STATE_NAME}
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
                              <button className="state-btn-save"
                                onClick={() => handleUpdate(state.id)}
                              >
                                Save
                              </button>

                              <button
                                className="state-btn-cancel"
                                onClick={handleCancel}
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{state.region_name}</td>
                            <td>{state.state_name}</td>
                            <td>{state.status}</td>

                            <td>
                              <button
                                className="state-btn-edit"
                                onClick={() => handleEdit(state)}
                              >
                                Edit
                              </button>

                              <button
                                className="state-btn-delete"
                                onClick={() => handleDelete(state.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center" }}>
                        No Data
                      </td>
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

export default CreateState;