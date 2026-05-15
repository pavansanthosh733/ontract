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
  const [passwordError, setPasswordError] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
    setError("");

    const normalizedEmail = email.toLowerCase().trim();

    if (!phoneNumber || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (phoneNumber.length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Invalid email format");
      return;
    }

    if (!isValidPassword(password)) {
      setError(
        "Password must be 8–12 characters, include 1 uppercase and 1 special character. No spaces allowed."
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
      const res = await fetch(`${BASE_URLS.user}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneNumber,
          email: normalizedEmail,
          password,
          captcha_token: captchaToken,
        }),
      });

      const data = await res.json();

      if (data.status === "ok") {
        navigate("/login", {
          state: {
            message:
              "Activation link sent to your email. Please activate before login.",
          },
        });
      } else {
        setPopup(data.message || "Signup failed");
        recaptchaRef.current.reset();
        setCaptchaToken(null);
      }
    } catch {
      setError("Something went wrong");
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

        {error && <div className="login-error">{error}</div>}

        {popup && (
          <div className="popup-overlay">
            <div className="popup-box">
              <p>{popup}</p>
              <button onClick={() => setPopup("")}>OK</button>
            </div>
          </div>
        )}

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
              maxLength={12}
              minLength={8}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              onChange={(e) => {
                const value = e.target.value;

                if (value.includes(" ")) return;

                setPassword(value);

                if (value.length === 0) {
                  setPasswordError("");
                } else if (!isValidPassword(value)) {
                  setPasswordError(
                    "Password must be 8–12 characters, include 1 uppercase and 1 special character. No spaces allowed."
                  );
                } else {
                  setPasswordError("");
                }
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

          {passwordError && (
            <div className="field-error">{passwordError}</div>
          )}

          {/* CONFIRM PASSWORD */}
          <div className="hw-input">
            <span className="hw-icon lock-icon"></span>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              maxLength={12}
              minLength={8}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              onChange={(e) => {
                const value = e.target.value;
                if (!value.includes(" ")) setConfirmPassword(value);
              }}
              disabled={loading}
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