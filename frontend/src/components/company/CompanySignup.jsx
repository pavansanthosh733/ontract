import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./css/CompanySignup.css";
import { apiPost } from "../../api";

function CompanySignup() {
  const navigate = useNavigate();
  const recaptchaRef = useRef();

  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const RECAPTCHA_SITE_KEY =
    "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  /* =========================
      VALIDATORS
  ========================= */

  const isValidEmail = (email) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      email.toLowerCase().trim()
    );

  const isValidMobile = (mobile) => {
    return /^[0-9]{10}$/.test(mobile);
  };

  const isValidPassword = (password) => {
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,12}$/;

    return passwordRegex.test(password);
  };

  /* =========================
      SUBMIT
  ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    // REQUIRED VALIDATION
    if (
      !companyName ||
      !registrationNumber ||
      !email ||
      !phoneNumber ||
      !password ||
      !confirmPassword
    ) {
      alert("All fields are required");
      return;
    }

    // EMAIL VALIDATION
    if (!isValidEmail(email)) {
      alert("Invalid email format");
      return;
    }

    // MOBILE VALIDATION
    if (!isValidMobile(phoneNumber)) {
      alert(
        "Mobile number must be exactly 10 digits"
      );
      return;
    }

    // PASSWORD VALIDATION
    if (!isValidPassword(password)) {
      alert(
        "Password must be 8–12 characters and include:\n\n• 1 Uppercase Letter\n• 1 Number\n• 1 Special Character"
      );
      return;
    }

    // PASSWORD MATCH
    if (password !== confirmPassword) {
      alert("❌ Passwords do not match");
      return;
    }

    // CAPTCHA
    if (!captchaToken) {
      alert("❌ Please verify captcha");
      return;
    }

    setLoading(true);

    try {
      await apiPost(
        "/api/contractor/contractor_signup",
        {
          company_name: companyName.trim(),
          business_registration_number:
            registrationNumber.trim(),
          email_id: email.trim(),
          phone_number: phoneNumber.trim(),
          password,
          captcha_token: captchaToken,
        }
      );

      alert(
        "✅ Registration successful.\n\nActivation link sent to your email."
      );

      navigate("/contractor/login", {
        state: {
          message:
            "Activation link sent to your email. Please activate before login.",
        },
      });

    } catch (err) {

      console.error("Signup Error:", err);

      alert(
        `${
          err?.message || "Signup failed"
        }`
      );

      // RESET CAPTCHA
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }

      setCaptchaToken(null);

    } finally {
      setLoading(false);
    }
  };

  /* =========================
      UI
  ========================= */

  return (
    <div className="login-wrapper">

      <div className="login-card">

        {/* HEADER */}
        <div className="contract-header"></div>

        <div className="login-title">
          Create Account
        </div>

        <form onSubmit={handleSubmit}>

          {/* COMPANY NAME */}
          <div className="hw-input">

            <span className="hw-icon company-icon"></span>

            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) =>
                setCompanyName(
                  e.target.value.trimStart()
                )
              }
            />

          </div>

          {/* REGISTRATION NUMBER */}
          <div className="hw-input">

            <span className="hw-icon user-icon"></span>

            <input
              type="text"
              placeholder="Business Registration Number"
              value={registrationNumber}
              onChange={(e) =>
                setRegistrationNumber(
                  e.target.value.trimStart()
                )
              }
            />

          </div>

          {/* EMAIL */}
          <div className="hw-input">

            <span className="hw-icon email-icon"></span>

            <input
              type="email"
              placeholder="Registered Email ID"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value.trimStart()
                )
              }
            />

          </div>

          {/* MOBILE */}
          <div className="hw-input">

            <span className="hw-icon mobile-icon"></span>

            <input
              type="tel"
              placeholder="Mobile Number"
              value={phoneNumber}
              maxLength={10}
              onChange={(e) => {

                const value =
                  e.target.value.replace(/\D/g, "");

                if (value.length <= 10) {
                  setPhoneNumber(value);
                }

              }}
            />

          </div>

          {/* PASSWORD */}
          <div className="hw-input">

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Password"
              value={password}
              maxLength={12}
              minLength={8}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <span
              className="hw-icon eye-icon"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              style={{
                cursor: "pointer",
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>

          </div>

          {/* CONFIRM PASSWORD */}
          <div className="hw-input">

            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirm Password"
              value={confirmPassword}
              maxLength={12}
              minLength={8}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
            />

            <span
              className="hw-icon eye-icon"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              style={{
                cursor: "pointer",
              }}
            >
              {showConfirmPassword
                ? "🙈"
                : "👁️"}
            </span>

          </div>

          {/* CAPTCHA */}
          <div className="hw-input hw-captcha">

            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={setCaptchaToken}
            />

          </div>

          {/* SUBMIT */}
          <button
            className="go-btn"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : "Register"}
          </button>

        </form>

        {/* LOGIN LINK */}
        <div className="extra-links">

          <Link to="/contractor/login">
            Already have an account?
          </Link>

        </div>

      </div>
    </div>
  );
}

export default CompanySignup;