import React, { useEffect, useState } from "react";
import "./css/createzone.css";
import { apiGet, apiPost } from "../../api";
import ZoneListTable from "./ZoneListTable";
import Swal from "sweetalert2";

const CreateZone = () => {
  const [formData, setFormData] = useState({
    zone_name: "",
    status: "Active",
    state_id: "",
  });

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const res = await apiGet("/api/zone/states");
      setStates(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error(error);
      setStates([]);
    }
  };

  /* ==========================================
     FETCH CITIES BY STATE
  ========================================== */
  const fetchCitiesByState = async (stateId) => {
    if (!stateId) {
      setCities([]);
      return;
    }

    try {
      setLoadingCities(true);

      const res = await apiGet(
        `/api/zone/available-cities/${stateId}`
      );

      setCities(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error(error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  /* ==========================================
     HANDLE INPUT CHANGE
  ========================================== */
  const handleChange = async (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // ✅ FIX: DO NOT RESET selectedCities
    if (name === "state_id") {
      await fetchCitiesByState(value);
    }
  };

  /* ==========================================
     TOGGLE CITY SELECTION
  ========================================== */
  const toggleCity = (city) => {
    setSelectedCities((prev) => {
      const exists = prev.find(
        (item) => item.city_id === city.city_id
      );

      if (exists) {
        return prev.filter(
          (item) => item.city_id !== city.city_id
        );
      }

      return [...prev, city];
    });
  };

  /* ==========================================
     REMOVE SELECTED CITY
  ========================================== */
  const removeSelectedCity = (cityId) => {
    setSelectedCities((prev) =>
      prev.filter((item) => item.city_id !== cityId)
    );
  };

  /* ==========================================
     RESET FORM
  ========================================== */
  const resetForm = () => {
    setFormData({
      zone_name: "",
      status: "Active",
      state_id: "",
    });

    setCities([]);
    setSelectedCities([]);
  };

  /* ==========================================
     SUBMIT
  ========================================== */
const handleSubmit = async (e) => {
  e.preventDefault();

  const zoneName = formData.zone_name.trim();

  if (!zoneName) {
    Swal.fire({
      icon: "warning",
      title: "Validation",
      text: "Zone name is required",
    });
    return;
  }

  if (selectedCities.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Validation",
      text: "Please select at least one city",
    });
    return;
  }

  const payload = {
    zone_name: zoneName,
    status: formData.status,
    state_id: formData.state_id,
    city_ids: selectedCities.map(
      (item) => item.city_id
    ),
  };

  try {
    setSaving(true);

    await apiPost("/api/zone/", payload);

    await Swal.fire({
      icon: "success",
      title: "Success",
      text: "Zone created successfully!",
      confirmButtonText: "OK",
    });

    resetForm();
    setRefreshKey((prev) => prev + 1);

  } catch (error) {
    console.error("Create zone error:", error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create zone",
      confirmButtonText: "OK",
    });

  } finally {
    setSaving(false);
  }
};

  return (
    <div className="zone-page">
      <div className="zone-container">

        {/* FORM BOX */}
        <div className="zone-box">
          <h2>Create Zone</h2>

          <form
            className="zone-form"
            onSubmit={handleSubmit}
          >

            {/* HEADER */}
            <div className="zone-header-row">
              <div className="zone-header-cell">
                ZONE NAME
              </div>
              <div className="zone-header-cell">
                STATUS
              </div>
            </div>

            <div className="zone-row">

              {/* ZONE NAME */}
              <div className="zone-input-wrapper">
                <input
                  type="text"
                  name="zone_name"
                  value={formData.zone_name}
                  onChange={handleChange}
                  placeholder="Enter Zone Name"
                  required
                />
                <span className="zone-star">★</span>
              </div>

              {/* STATUS */}
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

            {/* SECOND HEADER */}
            <div className="zone-header-row">
              <div className="zone-header-cell">
                STATE
              </div>
              <div className="zone-header-cell">
                SELECTED CITIES
              </div>
            </div>

            <div className="zone-row">

              {/* STATE */}
              <div className="zone-input-wrapper">
                <select
                  name="state_id"
                  value={formData.state_id}
                  onChange={handleChange}
                >
                  <option value="">Select State</option>

                  {states.map((state) => (
                    <option
                      key={state.id}
                      value={state.state_id}
                    >
                      {state.state_name}
                    </option>
                  ))}
                </select>

                <span className="zone-star">★</span>
              </div>

              {/* COUNT */}
              <div className="zone-count-box">
                {selectedCities.length} Cities Selected
              </div>

            </div>

            {/* CITY LIST */}
            {loadingCities ? (
              <div className="zone-empty-box">
                Loading cities...
              </div>
            ) : cities.length > 0 ? (
              <div className="zone-city-list">
                {cities.map((city) => (
                  <label
                    key={city.city_id}
                    className="zone-city-item"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCities.some(
                        (item) =>
                          item.city_id === city.city_id
                      )}
                      onChange={() =>
                        toggleCity(city)
                      }
                    />

                    <span>{city.city_name}</span>
                  </label>
                ))}
              </div>
            ) : formData.state_id ? (
              <div className="zone-empty-box">
                No available cities found
              </div>
            ) : null}

            {/* SELECTED CITY LIST */}
            {selectedCities.length > 0 && (
              <div className="zone-selected-list">
                {selectedCities.map((city) => (
                  <div
                    key={city.city_id}
                    className="zone-selected-item"
                  >
                    <span>{city.city_name}</span>

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedCity(
                          city.city_id
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* BUTTONS */}
            <div className="zone-actions">
              <button
                type="submit"
                className="zone-btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Submit"}
              </button>

              <button
                type="button"
                className="zone-btn-reset"
                onClick={resetForm}
                disabled={saving}
              >
                Reset
              </button>
            </div>

          </form>
        </div>

        {/* TABLE */}
        <ZoneListTable refreshKey={refreshKey} />

      </div>
    </div>
  );
};

export default CreateZone;