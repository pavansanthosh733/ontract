import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import "./css/otpverification.css";
import { BASE_URLS } from '../api';
import { useUser } from "../context/UserContext";

// ✅ Firebase for WEB only
import { getToken } from "firebase/messaging";
import { messaging } from "../firebase";

function OTPVerification() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const { loginUser } = useUser();

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URLS.user}/api/verify_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok && data?.user) {

        const userData = {
          ...data.user,
          role: "INDIVIDUAL",
        };

        loginUser(userData);

        console.log("🔥 OTP SUCCESS TRIGGERED");
        console.log("👤 USER ID:", userData.user_uid);

        // =========================
        // 📱 MOBILE (FLUTTER)
        // =========================
        if (window.flutter_inappwebview) {
          console.log("📱 Sending userId to Flutter");

          window.flutter_inappwebview.callHandler(
            "sendUserToFlutter",
            userData.user_uid.toString(),
            "INDIVIDUAL"
          );
        } else {
          console.log("🌐 Running in browser (no Flutter)");

          // =========================
          // 🌐 WEB PUSH (BROWSER ONLY)
          // =========================
          let fcmToken = null;

          try {
            const permission = await Notification.requestPermission();

            if (permission === "granted") {
              fcmToken = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
              });

              console.log("🔥 WEB TOKEN:", fcmToken);
            } else {
              console.warn("❌ Notification permission denied");
            }
          } catch (err) {
            console.error("❌ Token error:", err);
          }

          if (fcmToken) {
            try {
              await fetch(`${BASE_URLS.user}/api/save_token`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  "user_id": userData.user_uid,
                  "fcm_token": fcmToken,
                  "device_type": "web",
                  "role": "INDIVIDUAL",
                }),
              });

              console.log("✅ Web token saved");
            } catch (err) {
              console.error("❌ Save token error:", err);
            }
          }
        }

        // 🔥 Navigate AFTER sending to Flutter
        navigate("/provider_home", { replace: true });

      } else {
        setError(data?.error || "OTP verification failed");
      }
    } catch (err) {
      console.error("❌ OTP VERIFY ERROR:", err);
      setError("An error occurred. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${BASE_URLS.user}/api/resend_otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('A new OTP has been sent to your email.');
        setTimer(30);
      } else {
        setError(data.error || 'Failed to resend OTP.');
      }
    } catch {
      setError('An error occurred while resending OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otpverification-container">
      <div className="otpverification-card">
        <h2 className="otpverification-title">Verify OTP</h2>
        <p className="otpverification-text">An OTP has been sent to {email}</p>

        {error && <p className="otpverification-error">{error}</p>}
        {success && <p className="otpverification-success">{success}</p>}

        <form onSubmit={handleSubmit} className="otpverification-form">
          <div className="otpverification-input-group">
            <label className="otpverification-label">OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="otpverification-input"
              required
            />
          </div>
          <button type="submit" className="otpverification-button">
            Verify
          </button>
        </form>

        <button
          onClick={handleResendOtp}
          className="otpverification-resend-button"
          disabled={loading || timer > 0}
        >
          {loading
            ? 'Sending...'
            : timer > 0
            ? `Resend OTP (${timer}s)`
            : 'Resend OTP'}
        </button>
      </div>
    </div>
  );
}

export default OTPVerification;