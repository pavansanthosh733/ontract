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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  /* ============ VALIDATORS ============ */

 const isValidEmail = (email) =>
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
    email.toLowerCase().trim()
  );


  const isValidMobile = (mobile) => {
    return /^[0-9]{10}$/.test(mobile);
  };

  const isValidPassword = (password) => {
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,12}$/;
    return passwordRegex.test(password);
  };

  /* ============ SUBMIT ============ */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !companyName ||
      !registrationNumber ||
      !email ||
      !phoneNumber ||
      !password ||
      !confirmPassword
    ) {
      setError("All fields are required");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Invalid email format");
      return;
    }

    if (!isValidMobile(phoneNumber)) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    if (!isValidPassword(password)) {
      setError(
        "Password must be 8–12 characters, include 1 uppercase and 1 special character"
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!captchaToken) {
      setError("Please verify captcha");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/api/contractor/contractor_signup", {
        company_name: companyName,
        business_registration_number: registrationNumber,
        email_id: email,
        phone_number: phoneNumber,
        password,
        captcha_token: captchaToken,
      });

      navigate("/contractor/login", {
        state: {
          message:
            "Activation link sent to your email. Please activate before login.",
        },
      });
    } catch (err) {
      setError(err.message || "Signup failed");
      recaptchaRef.current.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  /* ============ UI ============ */

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="contract-header"></div>
        <div className="login-title">Create Account</div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* COMPANY NAME */}
          <div className="hw-input">
            <span className="hw-icon company-icon"></span>
            <input
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          {/* REGISTRATION NUMBER */}
          <div className="hw-input">
            <span className="hw-icon user-icon"></span>
            <input
              placeholder="Business Registration Number"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
          </div>

          {/* EMAIL */}
          <div className="hw-input">
            <span className="hw-icon email-icon"></span>
<input
  type="email"
  placeholder="Registered Email ID"
  value={email}
  onChange={(e) => setEmail(e.target.value.trimStart())}
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
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 10) setPhoneNumber(value);
              }}
            />
          </div>

          {/* PASSWORD */}
          <div className="hw-input">
            {/* <span className="hw-icon lock-icon"></span> */}
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              maxLength={12}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="hw-icon eye-icon"
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="hw-input">
            {/* <span className="hw-icon lock-icon"></span> */}
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              maxLength={12}
              minLength={8}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* CAPTCHA */}
          <div className="hw-input hw-captcha">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={setCaptchaToken}
            />
          </div>

          <button className="go-btn" disabled={loading}>
            {loading ? "Please wait..." : "Register"}
          </button>
        </form>

        <div className="extra-links">
          <Link to="/contractor/login">Already have an account?</Link>
        </div>
      </div>
    </div>
  );
}

export default CompanySignup;
