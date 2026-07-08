import React, { useState } from "react";
import "./css/AdminUpdate.css";
import { BASE_URL } from "../api";

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
  const [searchEmail, setSearchEmail]   = useState("");
  const [errors, setErrors]             = useState({});
  const [loading, setLoading]           = useState(false);
  const [userFound, setUserFound]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email:    "",
    mobile:   "",
    password: "",
    modules:  [],
  });

  // =====================================================
  // ✅ VALIDATION
  // =====================================================
  const validate = () => {
    const newErrors = {};

    // Full Name
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Full name must be at least 3 characters";
    } else if (formData.fullName.trim().length > 50) {
      newErrors.fullName = "Full name must be less than 50 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.fullName.trim())) {
      newErrors.fullName = "Full name must contain only letters";
    }

    // Mobile
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^[0-9]+$/.test(formData.mobile.trim())) {
      newErrors.mobile = "Mobile number must contain only digits";
    } else if (formData.mobile.trim().length !== 10) {
      newErrors.mobile = "Mobile number must be exactly 10 digits";
    } else if (/^(.)\1+$/.test(formData.mobile.trim())) {
      newErrors.mobile = "Enter a valid mobile number";
    }

    // Password — optional, only validate if filled
    if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (formData.password.length > 12) {
        newErrors.password = "Password must be less than 12 characters";
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one uppercase letter";
      } else if (!/[a-z]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one lowercase letter";
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one number";
      } else if (!/[@#%*]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one special character (@#%*)";
      }
    }

    // Modules
    if (formData.modules.length === 0) {
      newErrors.modules = "Please assign at least one module";
    }

    return newErrors;
  };

  // =====================================================
  // SEARCH USER
  // =====================================================
  const handleSearch = async () => {
  if (!searchEmail.trim()) {
    setErrors({ searchEmail: "Please enter email to search" });
    return;
  }

  if (!searchEmail.includes("@") || !searchEmail.includes(".")) {
    setErrors({ searchEmail: "Email must contain @ and ." });
    return;
  }

  setLoading(true);

  try {
    let response = await fetch(
      `${BASE_URL}/api/admin/workorders/admin/get-user/${searchEmail}`,
      {
        credentials: "include",
      }
    );

    // Token expired -> Refresh
    if (response.status === 401) {
      const refreshResponse = await fetch(
        `${BASE_URL}/api/admin/refresh`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (refreshResponse.ok) {
        response = await fetch(
          `${BASE_URL}/api/admin/workorders/admin/get-user/${searchEmail}`,
          {
            credentials: "include",
          }
        );
      } else {
        alert("❌ Session expired. Please login again.");
        window.location.href = "/admin/login";
        return;
      }
    }

    const data = await response.json();

    if (response.ok && data.success) {
      setFormData({
        fullName: data.data.fullName || "",
        email: data.data.email || "",
        mobile: data.data.mobile || "",
        password: "",
        modules: Array.isArray(data.data.modules)
          ? data.data.modules
          : data.data.modules?.split(",").map((m) => m.trim()) || [],
      });

      setUserFound(true);
      setErrors({});
    } else {
      alert(`❌ ${data.message || "User not found"}`);
      setUserFound(false);
    }
  } catch (error) {
    console.error("Search Error:", error);
    alert("❌ Server error");
  } finally {
    setLoading(false);
  }
};

  // =====================================================
  // RESET
  // =====================================================
  const handleReset = () => {
    setSearchEmail("");
    setFormData({
      fullName: "",
      email:    "",
      mobile:   "",
      password: "",
      modules:  [],
    });
    setErrors({});
    setUserFound(false);
    setShowPassword(false);
  };

  // =====================================================
  // HANDLE INPUT CHANGE
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Only numbers for mobile
    if (name === "mobile" && !/^[0-9]*$/.test(value)) return;

    // Only letters and spaces for fullName
    if (name === "fullName" && value !== "" && !/^[a-zA-Z\s]*$/.test(value)) return;

    // Only allowed chars for password
    if (name === "password" && value !== "" && !/^[a-zA-Z0-9@#%*]*$/.test(value)) return;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // =====================================================
  // HANDLE MODULE CHANGE
  // =====================================================
  const handleModuleChange = (module) => {
    setFormData((prev) => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter((m) => m !== module)
        : [...prev.modules, module],
    }));

    if (errors.modules) {
      setErrors((prev) => ({ ...prev, modules: "" }));
    }
  };

  // =====================================================
  // UPDATE USER
  // =====================================================
 const handleUpdate = async () => {
  if (!userFound) {
    alert("❌ Please search and select a user first");
    return;
  }

  const validationErrors = validate();

  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  setLoading(true);

  try {
    const payload = {
      fullName: formData.fullName,
      email: formData.email,
      mobile: formData.mobile,
      modules: formData.modules,
      ...(formData.password
        ? { password: formData.password }
        : {}),
    };

    let response = await fetch(
      `${BASE_URL}/api/admin/workorders/admin/update-user`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    // Token expired -> Refresh
    if (response.status === 401) {
      const refreshResponse = await fetch(
        `${BASE_URL}/api/admin/refresh`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (refreshResponse.ok) {
        response = await fetch(
          `${BASE_URL}/api/admin/workorders/admin/update-user`,
          {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        alert("❌ Session expired. Please login again.");
        window.location.href = "/admin/login";
        return;
      }
    }

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ User updated successfully");
      window.location.reload();
    } else {
      alert(`❌ ${data.message || "Update failed"}`);
    }
  } catch (error) {
    console.error("Update Error:", error);
    alert("❌ Server error");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="update-user-container">

      {/* =====================================================
          SEARCH SECTION
      ===================================================== */}
      <div className="search-section">
        <div className="search-header-row">
          <div className="section-title">Search User</div>

          <div className="search-bar">

            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter email to search"
                value={searchEmail}
                onChange={(e) => {
                  const value = e.target.value;

                  // ✅ Only allow letters, numbers, @ and .
                  if (value !== "" && !/^[a-zA-Z0-9@.]*$/.test(value)) return;

                  setSearchEmail(value);
                  if (errors.searchEmail) {
                    setErrors((prev) => ({ ...prev, searchEmail: "" }));
                  }
                }}
                className={errors.searchEmail ? "input-error" : ""}
              />
              {errors.searchEmail && (
                <span className="error-text">⚠ {errors.searchEmail}</span>
              )}
            </div>

            <button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>

            <button
              className="reset-btn"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </button>

          </div>
        </div>
      </div>

      {/* =====================================================
          DETAILS SECTION — only show after search
      ===================================================== */}
      {userFound && (
        <div className="details-section">
          <div className="section-title">User Details</div>

          {/* FULL NAME + MOBILE */}
          <div className="update-form-row">

            <div className="input-wrapper">
              <div className="form-label">Full Name</div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                maxLength={50}
                className={errors.fullName ? "input-error" : ""}
              />
              {errors.fullName && (
                <span className="error-text">⚠ {errors.fullName}</span>
              )}
            </div>

            <div className="input-wrapper">
              <div className="form-label">Mobile Number</div>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter mobile number"
                maxLength={10}
                className={errors.mobile ? "input-error" : ""}
              />
              {errors.mobile && (
                <span className="error-text">⚠ {errors.mobile}</span>
              )}
            </div>

          </div>

          {/* EMAIL — readonly */}
          <div className="full-width">
            <div className="form-label">Email</div>
            <input
              type="email"
              value={formData.email}
              readOnly
              className="readonly-input"
            />
          </div>

          {/* ✅ PASSWORD — optional */}
          <div className="full-width" style={{ marginTop: "12px" }}>
            <div className="form-label">
              New Password
              <span className="optional-text">
                (optional — fill only to change)
              </span>
            </div>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave empty to keep current password"
                maxLength={12}
                className={errors.password ? "input-error" : ""}
              />
              <span
                className="eye-icon"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
            {errors.password && (
              <span className="error-text">⚠ {errors.password}</span>
            )}
            <span className="password-hint">
              8–12 chars, uppercase, lowercase, number, special char (@#%*)
            </span>
          </div>

          {/* MODULES */}
          <div className="modules-section">
            <div className="modules-title">Assign Modules</div>
            <div className="modules-grid">
              {modulesList.map((mod) => (
                <label key={mod} className="module-label">
                  <input
                    type="checkbox"
                    checked={formData.modules.includes(mod)}
                    onChange={() => handleModuleChange(mod)}
                  />
                  {mod}
                </label>
              ))}
            </div>
            {errors.modules && (
              <span className="error-text">⚠ {errors.modules}</span>
            )}
          </div>

          {/* UPDATE BUTTON */}
          <button
            className="update-btn"
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update User"}
          </button>

        </div>
      )}
    </div>
  );
}

export default AdminUpdate;