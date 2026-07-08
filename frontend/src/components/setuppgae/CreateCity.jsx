import React, { useState, useEffect } from "react";
import "./css/createcity.css";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api.js";
import Swal from "sweetalert2";

const CreateCity = () => {
  const [formData, setFormData] = useState({
    REGION_ID: "",
    STATE_ID: "",
    CITY_NAME: "",
    STATUS: "Active",
  });

  const [regionsList, setRegionsList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [cities, setCities] = useState([]);

  const [editingId, setEditingId] = useState(null);
  // ✅ Filters for Existing Cities Table
const [filters, setFilters] = useState({
  region: "",
  state: "",
  city: "",
  status: "",
});

  const [editingData, setEditingData] = useState({
    CITY_NAME: "",
    STATUS: "",
  });

  // Fetch Regions
  const fetchRegions = async () => {
    const data = await apiGet("/api/admin/region/");
    setRegionsList(Array.isArray(data) ? data : []);
  };

  // Fetch States by Region
  const fetchStatesByRegion = async (regionId) => {
    if (!regionId) {
      setStatesList([]);
      return;
    }

    const data = await apiGet(`/api/admin/state/by-region/${regionId}`);
    setStatesList(Array.isArray(data) ? data : []);
  };

  // Fetch Cities
  const fetchCities = async () => {
    const data = await apiGet("/api/admin/city/");
    setCities(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchRegions();
    fetchCities();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "REGION_ID") {
      setFormData({
        ...formData,
        REGION_ID: value,
        STATE_ID: "",
      });
      fetchStatesByRegion(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEditChange = (e) => {
    setEditingData({ ...editingData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      region_id: formData.REGION_ID,
      state_id: formData.STATE_ID,
      city_name: formData.CITY_NAME,
      status: formData.STATUS,
    };

    await apiPost("/api/admin/city/", payload);

    await Swal.fire({
      icon: "success",
      title: "Success",
      text: "City added successfully!",
      confirmButtonText: "OK",
    });

    fetchCities();

    setFormData({
      REGION_ID: "",
      STATE_ID: "",
      CITY_NAME: "",
      STATUS: "Active",
    });
    setStatesList([]);
  } catch (error) {
    console.error("Add city error:", error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: error?.message || "Failed to add city",
      confirmButtonText: "OK",
    });
  }
};

  const handleEdit = (city) => {
    setEditingId(city.id);
    setEditingData({
      CITY_NAME: city.city_name,
      STATUS: city.status,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({
      CITY_NAME: "",
      STATUS: "",
    });
  };

  const handleUpdate = async (id) => {
    const payload = {
      city_name: editingData.CITY_NAME,
      status: editingData.STATUS,
    };

    const res = await apiPut(`/api/admin/city/${id}`, payload);

    if (res?.error) return alert("❌ " + res.error);

    alert("✅ City updated!");
    setEditingId(null);
    fetchCities();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this city?")) return;

    await apiDelete(`/api/admin/city/${id}`);
    alert("🗑️ City deleted!");
    fetchCities();
  };

  const handleReset = () => {
    setFormData({
      REGION_ID: "",
      STATE_ID: "",
      CITY_NAME: "",
      STATUS: "Active",
    });
    setStatesList([]);
  };
  // ✅ Handle Filter Typing
const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters({ ...filters, [name]: value });
};

// ✅ Apply Filters
const filteredCities = cities.filter((c) => {
  return (
    c.region_name.toLowerCase().includes(filters.region.toLowerCase()) &&
    c.state_name.toLowerCase().includes(filters.state.toLowerCase()) &&
    c.city_name.toLowerCase().includes(filters.city.toLowerCase()) &&
    c.status.toLowerCase().includes(filters.status.toLowerCase())
  );
});


  return (
    <div className="city-page">
      <div className="city-container">

        {/* ============= FORM BOX ============= */}
        <div className="city-box">
          <h2>Add New City</h2>

          <form className="city-form" onSubmit={handleSubmit}>

            {/* HEADER 1 */}
            <div className="city-header-row">
              <div className="city-header-cell">REGION</div>
              <div className="city-header-cell">STATE</div>
            </div>

            <div className="city-row">
              {/* REGION */}
              <div className="city-input-wrapper">
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
                <span className="city-star">★</span>
              </div>

              {/* STATE */}
              <div className="city-input-wrapper">
                <select
                  name="STATE_ID"
                  value={formData.STATE_ID}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select State</option>
                  {statesList.map((s) => (
                    <option key={s.id} value={s.state_id}>
                      {s.state_name}
                    </option>
                  ))}
                </select>
                <span className="city-star">★</span>
              </div>
            </div>

            {/* HEADER 2 */}
            <div className="city-header-row">
              <div className="city-header-cell">CITY NAME</div>
              <div className="city-header-cell">STATUS</div>
            </div>

            <div className="city-row">
              {/* CITY NAME */}
              <div className="city-input-wrapper">
                <input
                  type="text"
                  name="CITY_NAME"
                  placeholder="Enter City Name"
                  value={formData.CITY_NAME}
                  onChange={handleChange}
                  required
                />
                <span className="city-star">★</span>
              </div>

              {/* STATUS */}
              <div className="city-input-wrapper">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="city-star">★</span>
              </div>
            </div>

            <div className="city-actions">
              <button className="city-btn-primary">Submit</button>
              <button type="button" className="city-btn-reset" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* ============= TABLE BOX ============= */}
        <div className="city-box">
          <h2>Existing Cities</h2>

          <div className="city-table-wrapper">
            <div className="fixed-table">
              <table className="city-table">
<thead>
  {/* ✅ Main Header Row */}
  <tr>
    <th>Region</th>
    <th>State</th>
    <th>City</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>

  {/* ✅ Filter Input Row */}
  <tr>
    <th>
      <input
        type="text"
        name="region"
        placeholder="Filter region..."
        value={filters.region}
        onChange={handleFilterChange}
        className="city-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="state"
        placeholder="Filter state..."
        value={filters.state}
        onChange={handleFilterChange}
        className="city-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="city"
        placeholder="Filter city..."
        value={filters.city}
        onChange={handleFilterChange}
        className="city-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="status"
        placeholder="Filter status..."
        value={filters.status}
        onChange={handleFilterChange}
        className="city-filter-input"
      />
    </th>

    <th></th>
  </tr>
</thead>


                <tbody>
                  {cities.length > 0 ? (
                    filteredCities.map((city) => (

                      <tr key={city.id}>
                        {editingId === city.id ? (
                          <>
                            <td>{city.region_name}</td>
                            <td>{city.state_name}</td>

                            <td>
                              <input
                                type="text"
                                name="CITY_NAME"
                                value={editingData.CITY_NAME}
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
                              <button className="city-btn-save" onClick={() => handleUpdate(city.id)}>Save</button>
                              <button className="city-btn-cancel" onClick={handleCancel}>Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{city.region_name}</td>
                            <td>{city.state_name}</td>
                            <td>{city.city_name}</td>
                            <td>{city.status}</td>

                            <td>
                              <button className="city-btn-edit" onClick={() => handleEdit(city)}>Edit</button>
                              <button className="city-btn-delete" onClick={() => handleDelete(city.id)}>Delete</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">No Data</td>
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

export default CreateCity;