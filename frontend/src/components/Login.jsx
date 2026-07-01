import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import "./css/login.css";
import { BASE_URLS } from "../api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [generatedCaptchaCode, setGeneratedCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const resetCredentialTimer = () => {
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setEmail("");
      setPassword("");
      generateCaptcha(); // Refresh captcha automatically
    }, 60000); // 1 minute
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  /* ================= CAPTCHA ================= */

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setGeneratedCaptchaCode(code);
    setCaptchaInput("");

    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 120, 40);
    gradient.addColorStop(0, "#f8f9ff");
    gradient.addColorStop(1, "#e8f0ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 120, 40);

    ctx.strokeStyle = "#e1e5e9";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 118, 38);

    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#0a4ea3";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < code.length; i++) {
      ctx.save();
      ctx.translate(15 + i * 18, 20);
      ctx.rotate((Math.random() - 0.5) * 0.3);
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }

    setCaptchaImage(canvas.toDataURL());
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      alert("Email and Password are required");
      return;
    }

    if (captchaInput.toUpperCase() !== generatedCaptchaCode) {
      alert("Invalid Captcha");
      generateCaptcha();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URLS.user}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        clearTimeout(timerRef.current);
        alert(data.message);
        navigate("/verify-otp", {
          state: { email }
        });
      } else {
        alert(data.error || "Login failed");
        generateCaptcha();
      }
    } catch (err) {
      alert("Something went wrong");
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="login-wrapper">
      <div className="login-card">


        <div className="contract-header">


        </div>

        <div className="login-title">
          Log in to ontract Application
        </div>

        {/* 🔑 KEY IMAGE */}
        <div className="login-key">
          <img src="/assets/images/key.png" alt="Key" />
        </div>

        {error && <div className="login-error">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>

          {/* EMAIL */}
          <div className="hw-input">
            <span className="hw-icon user-icon"></span>
            <input
              type="email"
              placeholder="Registered Email ID"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                resetCredentialTimer();
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
              onChange={(e) => {
                setPassword(e.target.value);
                resetCredentialTimer();
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

          {/* CAPTCHA */}
          <div className="captcha-row">
            {captchaImage && (
              <img src={captchaImage} alt="Captcha" />
            )}

            <span
              className="captcha-get"
              onClick={() => {
                generateCaptcha();
                resetCredentialTimer();
              }}
            >
              <RefreshCw size={20} />
            </span>
          </div>

          <input
            className="captcha-input"
            placeholder="Enter Captcha"
            value={captchaInput}
            onChange={(e) => {
              setCaptchaInput(e.target.value.toUpperCase());
              resetCredentialTimer();
            }}
          />

          <p className="captcha-text">
            Please enter the letters and numbers exactly as shown in the image above.
          </p>

          <button className="go-btn" disabled={loading}>
            {loading ? "Please wait..." : "Go"}
          </button>
        </form>

        <div className="extra-links">
          <Link to="/forgot_password">Forgot Password?</Link>
          <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;