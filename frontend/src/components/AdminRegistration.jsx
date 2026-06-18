import React, { useState } from "react";
import "./css/AdminRegistration.css";
import { BASE_URL } from "../api";

const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    modules: [],
  });

  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    // Email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !formData.email.includes("@") ||
      !formData.email.includes(".")
    ) {
      newErrors.email = "Email must contain @ and .";
    }

    // Password
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
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

    // Modules
    if (formData.modules.length === 0) {
      newErrors.modules = "Please assign at least one module";
    }

    return newErrors;
  };

  // =====================================================
  // HANDLE INPUT
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Only allow numbers for mobile
    if (name === "mobile" && !/^[0-9]*$/.test(value)) return;

    // Only allow letters and spaces for fullName
    if (name === "fullName" && value !== "" && !/^[a-zA-Z\s]*$/.test(value)) return;

    // Only allow valid email characters
    if (name === "email" && value !== "" && !/^[a-zA-Z0-9@.]*$/.test(value)) return;

    // Only allow letters, numbers and @#%* for password
    if (name === "password" && value !== "" && !/^[a-zA-Z0-9@#%*]*$/.test(value)) return;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error on typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // =====================================================
  // HANDLE MODULES
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
  // RESET
  // =====================================================
  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
      mobile: "",
      modules: [],
    });
    setErrors({});
    setShowPassword(false);
  };

  // =====================================================
  // SUBMIT
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/workorders/admin/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            modules: formData.modules,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert("✅ User Registered Successfully");
        resetForm();
      } else {
        alert(`❌ ${data.message || data.error || "Registration failed"}`);
      }
    } catch (error) {
      console.error("API ERROR:", error);
      alert("❌ Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="section-card">

        <div className="section-header">USER REGISTRATION</div>

        <div className="section-content">

          {/* FULL NAME + EMAIL */}
          <div className="form-header-row">
            <div>FULL NAME</div>
            <div>EMAIL</div>
          </div>

          <div className="form-input-row">

            <div className="input-wrapper">
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
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                maxLength={100}
                className={errors.email ? "input-error" : ""}
              />
              {errors.email && (
                <span className="error-text">⚠ {errors.email}</span>
              )}
            </div>

          </div>

          {/* PASSWORD + MOBILE */}
          <div className="form-header-row">
            <div>PASSWORD</div>
            <div>MOBILE NUMBER</div>
          </div>

          <div className="form-input-row">

            {/* ✅ PASSWORD WITH EYE ICON */}
            <div className="input-wrapper">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (8-12 chars)"
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

            {/* MOBILE */}
            <div className="input-wrapper">
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                className={errors.mobile ? "input-error" : ""}
              />
              {errors.mobile && (
                <span className="error-text">⚠ {errors.mobile}</span>
              )}
            </div>

          </div>

          {/* MODULES */}
          <div className="modules-section">
            <div className="form-header-row">
              <div>Assign Modules</div>
            </div>

            <div className="modules-row">
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

          {/* BUTTONS */}
          <div className="form-actions">
            <button
              className="blue-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>

            <button
              type="button"
              className="blue-btn cancel"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;