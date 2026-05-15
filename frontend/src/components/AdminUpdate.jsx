// =====================================================
// FILE: AdminUpdate.jsx
// FULL CORRECTED CODE
// ✔ Fix module character split issue
// ✔ Invoice module support
// ✔ Proper module array handling
// ✔ Navbar refresh
// ✔ No logout/login required
// =====================================================

import React, { useState } from "react";
import "./css/AdminUpdate.css";
import { BASE_URL } from "../api";

// =====================================================
// MODULE LIST
// =====================================================
const modulesList = [
  "Home",
  "Registration",
  "Set Up page",
  "Work Orders",
  "Invoice",
  "Standard Rate",
  "Management",
  "Notifications",
  "Reports",
];

function AdminUpdate() {
  const [searchEmail, setSearchEmail] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    modules: [],
  });

  // =====================================================
  // SEARCH USER
  // =====================================================
  const handleSearch = async () => {
    if (!searchEmail) {
      alert("❌ Please enter email");
      return;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/api/workorders/admin/get-user/${searchEmail}`
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData({
          fullName: data.data.fullName || "",
          email: data.data.email || "",
          mobile: data.data.mobile || "",

          // =====================================================
          // 🔥 FIX:
          // Handle proper module array
          // =====================================================
          modules: Array.isArray(data.data.modules)
            ? data.data.modules
            : data.data.modules
                ?.split(",")
                .map((m) => m.trim()) || [],
        });

      } else {
        alert(
          `❌ ${data.message || "User not found"}`
        );
      }

    } catch (error) {
      console.error(
        "Search Error:",
        error
      );

      alert("❌ Server error");
    }
  };

  // =====================================================
  // RESET
  // =====================================================
  const handleReset = () => {
    setSearchEmail("");

    setFormData({
      fullName: "",
      email: "",
      mobile: "",
      modules: [],
    });
  };

  // =====================================================
  // HANDLE INPUT CHANGE
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // HANDLE MODULE CHANGE
  // =====================================================
  const handleModuleChange = (module) => {
    setFormData((prev) => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter(
            (m) => m !== module
          )
        : [...prev.modules, module],
    }));
  };

  // =====================================================
  // UPDATE USER
  // =====================================================
  const handleUpdate = async () => {
    if (!formData.email) {
      alert(
        "❌ Please search and select user first"
      );
      return;
    }

    if (formData.modules.length === 0) {
      alert(
        "❌ Please assign at least one module"
      );
      return;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/api/workorders/admin/update-user`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          // =====================================================
          // 🔥 FIX:
          // Send modules as ARRAY
          // =====================================================
          body: JSON.stringify({
            ...formData,
            modules: formData.modules,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert(
          "✅ User updated successfully"
        );

        // =====================================================
        // CLEAR OLD CACHE
        // =====================================================
        localStorage.removeItem(
          "adminData"
        );

        // =====================================================
        // REFRESH NAVBAR
        // =====================================================
        window.location.reload();

      } else {
        alert(
          `❌ ${
            data.message ||
            "Update failed"
          }`
        );
      }

    } catch (error) {
      console.error(
        "Update Error:",
        error
      );

      alert("❌ Server error");
    }
  };

  return (
    <div className="update-user-container">

      {/* SEARCH SECTION */}
      <div className="search-section">

        <div className="search-header-row">

          <div className="section-title">
            Search User
          </div>

          <div className="search-bar">

            <input
              type="email"
              placeholder="Enter email to search"
              value={searchEmail}
              onChange={(e) =>
                setSearchEmail(
                  e.target.value
                )
              }
            />

            <button
              onClick={handleSearch}
            >
              Search
            </button>

            <button
              className="reset-btn"
              onClick={handleReset}
            >
              Reset
            </button>

          </div>
        </div>
      </div>

      {/* DETAILS SECTION */}
      <div className="details-section">

        <div className="section-title">
          User Details
        </div>

        {/* FULL NAME + MOBILE */}
        <div className="update-form-row">

          <div>
            <div className="form-label">
              Full Name
            </div>

            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
            />
          </div>

          <div>
            <div className="form-label">
              Mobile Number
            </div>

            <input
              type="text"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter mobile number"
            />
          </div>

        </div>

        {/* EMAIL */}
        <div className="full-width">

          <div className="form-label">
            Email
          </div>

          <input
            type="email"
            value={formData.email}
            readOnly
            className="readonly-input"
          />

        </div>

        {/* MODULES */}
        <div className="modules-section">

          <div className="modules-title">
            Assign Modules
          </div>

          <div className="modules-grid">

            {modulesList.map((mod) => (
              <label
                key={mod}
                className="module-label"
              >

                <input
                  type="checkbox"
                  checked={formData.modules.includes(
                    mod
                  )}
                  onChange={() =>
                    handleModuleChange(mod)
                  }
                />

                {mod}

              </label>
            ))}

          </div>
        </div>

        {/* UPDATE BUTTON */}
        <button
          className="update-btn"
          onClick={handleUpdate}
        >
          Update User
        </button>

      </div>
    </div>
  );
}

export default AdminUpdate;