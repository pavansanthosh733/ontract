import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api";
import "./css/createzone.css";

// ✅ Lightweight Toast
const showToast = (message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `zone-toast ${type}`;
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
};

const EditZone = () => {
  const { id } = useParams(); // numeric id
  const navigate = useNavigate();

  const [zoneCode, setZoneCode] = useState(""); // 🔥 ZONE002

  const [formData, setFormData] = useState({
    zone_name: "",
    status: "Active",
    state_id: "",
  });

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [existingCities, setExistingCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPage();
  }, [id]);

  // =========================
  // LOAD PAGE
  // =========================
  const loadPage = async () => {
    try {
      setLoading(true);

      const stateRes = await apiGet("/api/state/");
      setStates(Array.isArray(stateRes) ? stateRes : []);

      const zoneRes = await apiGet(`/api/zone/${id}`);

      if (zoneRes?.error) {
        showToast(zoneRes.error, "error");
        navigate("/admin/setuppage/create-zone");
        return;
      }

      setZoneCode(zoneRes.zone_id); // 🔥 IMPORTANT

      setFormData({
        zone_name: zoneRes.zone_name || "",
        status: zoneRes.status || "Active",
        state_id: "",
      });

      setExistingCities(Array.isArray(zoneRes.cities) ? zoneRes.cities : []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load zone", "error");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FETCH CITIES
  // =========================
  const fetchAvailableCities = async (stateId) => {
    if (!stateId) {
      setCities([]);
      return;
    }

    try {
      const res = await apiGet(`/api/zone/available-cities/${stateId}`);
      setCities(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error(error);
      setCities([]);
      showToast("Failed to fetch cities", "error");
    }
  };

  // =========================
  // HANDLE INPUT
  // =========================
  const handleChange = async (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "state_id") {
      setSelectedCities([]);
      await fetchAvailableCities(value);
    }
  };

  // =========================
  // TOGGLE CITY
  // =========================
  const toggleCity = (city) => {
    const exists = selectedCities.find(
      (item) => item.city_id === city.city_id
    );

    if (exists) {
      setSelectedCities((prev) =>
        prev.filter((item) => item.city_id !== city.city_id)
      );
    } else {
      setSelectedCities((prev) => [...prev, city]);
    }
  };

  // =========================
  // UPDATE ZONE (uses numeric id)
  // =========================
  const handleUpdateZone = async (e) => {
    e.preventDefault();

    if (!formData.zone_name.trim()) {
      showToast("Zone name required", "error");
      return;
    }

    try {
      setSaving(true);

      const res = await apiPut(`/api/zone/${id}`, {
        zone_name: formData.zone_name,
        status: formData.status,
      });

      if (res?.error) {
        showToast(res.error, "error");
        return;
      }

      showToast("Zone updated successfully");
      navigate("/admin/setuppage/zones");
    } catch (error) {
      console.error(error);
      showToast("Failed to update zone", "error");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // ADD MORE CITIES (uses zoneCode)
  // =========================
  const addMoreCities = async () => {
    if (!zoneCode) {
      showToast("Zone not loaded properly", "error");
      return;
    }

    if (selectedCities.length === 0) {
      showToast("Select cities first", "error");
      return;
    }

    try {
      const res = await apiPost(`/api/zone/${zoneCode}/add-cities`, {
        city_ids: selectedCities.map((item) => item.city_id),
      });

      if (res?.error) {
        showToast(res.error, "error");
        return;
      }

      showToast("Cities added successfully");

      // Optimistic UI
      setExistingCities((prev) => [...prev, ...selectedCities]);

      setSelectedCities([]);
      setCities([]);
      setFormData((prev) => ({
        ...prev,
        state_id: "",
      }));

      loadPage(); // sync
    } catch (error) {
      console.error(error);
      showToast("Failed to add cities", "error");
    }
  };

  // =========================
  // REMOVE CITY (uses zoneCode)
  // =========================
const removeCity = async (cityId) => {
  if (!zoneCode) {
    showToast("Zone not loaded properly", "error");
    return;
  }

  // VALIDATION
 if (existingCities.length <= 1) {
  alert("At least one city is required in a zone");
  return;
}

  const ok = window.confirm("Remove this city from zone?");
  if (!ok) return;

  const backup = [...existingCities];

  setExistingCities((prev) =>
    prev.filter((c) => c.city_id !== cityId)
  );

    try {
      const res = await apiDelete(
        `/api/zone/${zoneCode}/city/${cityId}`
      );

      if (res?.error) {
        throw new Error(res.error);
      }

      showToast("City removed successfully");
    } catch (error) {
      console.error(error);

      // rollback
      setExistingCities(backup);

      showToast("Failed to remove city", "error");
    }
  };

  // =========================
  // LOADING UI
  // =========================
  if (loading) {
    return (
      <div className="zone-page">
        <div className="zone-container">
          <div className="zone-box">
            <h2>Edit Zone</h2>
            <div className="zone-form">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="zone-page">
      <div className="zone-container">
        <div className="zone-box">
          <h2>Edit Zone</h2>

          <form className="zone-form" onSubmit={handleUpdateZone}>
            {/* HEADER */}
            <div className="zone-header-row">
              <div className="zone-header-cell">ZONE NAME</div>
              <div className="zone-header-cell">STATUS</div>
            </div>

            <div className="zone-row">
              <div className="zone-input-wrapper">
                <input
                  type="text"
                  name="zone_name"
                  value={formData.zone_name}
                  disabled
                  onChange={handleChange}
                />
                <span className="zone-star">★</span>
              </div>

              <div className="zone-input-wrapper">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="zone-star">★</span>
              </div>
            </div>

            {/* CURRENT CITIES */}
            <div className="zone-selected-list">
              {existingCities.map((city) => (
                <div key={city.city_id} className="zone-selected-item">
                  <span>{city.city_name}</span>

                  <button
                    type="button"
                    onClick={() => removeCity(city.city_id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* ADD MORE CITIES */}
            <div className="zone-header-row">
              <div className="zone-header-cell">STATE</div>
              <div className="zone-header-cell">ADD MORE CITIES</div>
            </div>

            <div className="zone-row">
              <div className="zone-input-wrapper">
                <select
                  name="state_id"
                  value={formData.state_id}
                  onChange={handleChange}
                >
                  <option value="">Select State</option>

                  {states.map((state) => (
                    <option key={state.id} value={state.state_id}>
                      {state.state_name}
                    </option>
                  ))}
                </select>

                <span className="zone-star">★</span>
              </div>

              <div className="zone-count-box">
                {selectedCities.length} Selected
              </div>
            </div>

            {cities.length > 0 && (
              <div className="zone-city-list">
                {cities.map((city) => (
                  <label key={city.city_id} className="zone-city-item">
                    <input
                      type="checkbox"
                      checked={selectedCities.some(
                        (item) => item.city_id === city.city_id
                      )}
                      onChange={() => toggleCity(city)}
                    />
                    <span>{city.city_name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="zone-actions">
              <button
                type="submit"
                className="zone-btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Update Zone"}
              </button>

              <button
                type="button"
                className="zone-btn-reset"
                onClick={addMoreCities}
              >
                Add Cities
              </button>

              <button
                type="button"
                className="zone-btn-delete"
                onClick={() =>
                  navigate("/admin/setuppage/zones")
                }
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditZone;