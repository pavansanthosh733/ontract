import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./css/signup.css";
import { BASE_URLS } from "../api";

function Signup() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const recaptchaRef = useRef();
  const navigate = useNavigate();

  const RECAPTCHA_SITE_KEY =
    "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  /* ================= VALIDATORS ================= */

  const isValidEmail = (email) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const isValidPassword = (password) =>
    /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[^\s]{8,12}$/.test(
      password
    );

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.toLowerCase().trim();

    // ALL FIELDS
    if (!phoneNumber || !email || !password || !confirmPassword) {
      alert("All fields are required");
      return;
    }

    // MOBILE
    if (phoneNumber.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }

    // EMAIL
    if (!isValidEmail(normalizedEmail)) {
      alert("Invalid email format");
      return;
    }

    // PASSWORD
    if (!isValidPassword(password)) {
      alert(
        "Password must be 8–12 characters, include 1 uppercase and 1 special character. No spaces allowed."
      );
      return;
    }

    // CONFIRM PASSWORD
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // CAPTCHA
    if (!captchaToken) {
      alert("Please verify captcha");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URLS.user}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          phone_number: phoneNumber,
          email: normalizedEmail,
          password,
          captcha_token: captchaToken,
        }),
      });

      const data = await res.json();

      // SUCCESS
      if (data.status === "ok") {

        alert(
          "Activation link sent to your Registered email. Please activate before login."
        );

        navigate("/");

      } else {

        alert(data.message || "Signup failed");

        recaptchaRef.current.reset();
        setCaptchaToken(null);
      }

    } catch (err) {

      console.error(err);

      alert("Something went wrong");

    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="contract-header"></div>
        <div className="login-title">Create Account</div>


        <form onSubmit={handleSubmit}>
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
              disabled={loading}
            />
          </div>

          {/* EMAIL */}
          <div className="hw-input">
            <span className="hw-icon email-icon"></span>
            <input
              type="email"
              placeholder="Registered Email ID"
              value={email}
              onChange={(e) => {
                const value = e.target.value;
                
                  setEmail(value);
                
              }}
              disabled={loading}
            />
          </div>

          {/* PASSWORD */}
          <div className="hw-input">
            <span className="hw-icon lock-icon"></span>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes(" ")) return;
                setPassword(value);
              }}
              disabled={loading}
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
            <span className="hw-icon lock-icon"></span>

            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              onChange={(e) => {
                const value = e.target.value;
                if (!value.includes(" ")) {
                  setConfirmPassword(value);
                }
              }}
              disabled={loading}
            />

            <span
              className="hw-icon eye-icon"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              style={{ cursor: "pointer" }}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
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

          <button className="go-btn" disabled={loading}>
            {loading ? "Please wait..." : "Sign Up"}
          </button>
        </form>

        <div className="extra-links">
          <Link to="/login">Already have an account?</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;