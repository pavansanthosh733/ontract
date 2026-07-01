import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import "./css/AdminLogin.css";

import { BASE_URLS } from "../api";
import { useAdmin } from "../context/AdminContext";

// Firebase
import { getToken } from "firebase/messaging";
import { messaging } from "../firebase";

function AdminLogin() {
  const navigate = useNavigate();

  const { loginAdmin } = useAdmin();

  // =====================================================
  // STATE
  // =====================================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");

  const [step, setStep] = useState("login");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
const [countdown, setCountdown] = useState(30);
const [canResend, setCanResend] = useState(false);



    const resetCredentialTimer = () => {
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 300000); // 5 minutes
  };

  useEffect(() => {
    resetCredentialTimer();

    return () => clearTimeout(timerRef.current);
  }, []);
  const timerRef = useRef(null);


  useEffect(() => {
  if (step === "otp") {
    setCanResend(false);
    setCountdown(30);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }
}, [step]);

  const handleResendOtp = async () => {
  try {
    const res = await fetch(
      `${BASE_URLS.admin}/api/admin/resend_otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to resend OTP");
      return;
    }

    alert(data.message);

  } catch (err) {
    setError("Failed to resend OTP");
  }
};

  // =====================================================
  // LOGIN SUBMIT
  // =====================================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    console.group("ADMIN LOGIN");

    setError("");

    if (!email || !password) {
      console.warn(
        "Email/password missing"
      );

      setError(
        "Email and password are required"
      );

      console.groupEnd();

      return;
    }

    setLoading(true);

    try {
      console.log(
        "Sending admin login request..."
      );

      const res = await fetch(
        `${BASE_URLS.admin}/api/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      console.log(
        "Login response:",
        data
      );

      if (res.ok) {
        console.log(
          "Admin login success. OTP sent."
        );

                clearTimeout(timerRef.current);

        setStep("otp");

      } else {
        console.error(
          "Login failed:",
          data
        );

        setError(
          data.error || "Login failed"
        );
      }

    } catch (err) {

      console.error(
        "Admin login API error:",
        err
      );

      setError("Something went wrong");

    } finally {

      setLoading(false);

      console.groupEnd();
    }
  };

  // =====================================================
  // OTP VERIFY
  // =====================================================
  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    console.group("ADMIN OTP VERIFY");

    setError("");

    if (!otp) {

      console.warn("OTP missing");

      setError("OTP is required");

      console.groupEnd();

      return;
    }

    setLoading(true);

    try {

      console.log(
        "Verifying OTP..."
      );

      const res = await fetch(
        `${BASE_URLS.admin}/api/admin/verify_otp`,
        {
          method: "POST",
          credentials: "include", 
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      const data = await res.json();

      console.log(
        "OTP response:",
        data
      );

      if (!res.ok) {

        console.error(
          "OTP verification failed"
        );

        setError(
          data.error ||
          "OTP verification failed"
        );

        return;
      }

      console.log(
        "OTP verified successfully"
      );

      // =====================================================
      // NORMALIZE ADMIN
      // =====================================================
      const adminData = {
    ...data.admin,
    role: "admin",
     access_token: data.access_token,
};

      console.log(
        "Normalized admin data:",
        adminData
      );

      // =====================================================
      // SAVE ADMIN
      // =====================================================
      console.log(
  "JWT From Backend:",
  data.access_token
);
      
    loginAdmin(adminData);

      console.log(
        "Admin saved into context/localStorage"
      );

      // =====================================================
      // FIREBASE TOKEN
      // =====================================================
      let fcmToken = null;

      try {

        console.group(
          "FCM TOKEN GENERATION"
        );

        if (
          !("serviceWorker" in navigator)
        ) {

          console.warn(
            "Service worker unsupported"
          );

        } else {

          console.log(
            "Requesting notification permission..."
          );

          const permission =
            await Notification.requestPermission();

          console.log(
            "Notification permission:",
            permission
          );

          if (permission === "granted") {

            console.log(
              "Registering firebase service worker..."
            );

            const registration =
              await navigator.serviceWorker.register(
                "/firebase-messaging-sw.js"
              );

            console.log(
              "Service worker registered:",
              registration
            );

await navigator.serviceWorker.ready;

console.log(
  "Cleaning old Firebase caches..."
);

// 🔥 unregister old service workers
const registrations =
  await navigator.serviceWorker.getRegistrations();

for (const reg of registrations) {
  console.log(
    "Found SW:",
    reg.scope
  );
}

// 🔥 clear old indexedDB issue
if ("indexedDB" in window) {

  indexedDB.deleteDatabase(
    "firebase-messaging-database"
  );

  indexedDB.deleteDatabase(
    "firebase-installations-database"
  );

  console.log(
    "Firebase IndexedDB cleared"
  );
}

// 🔥 longer stabilization
await new Promise((resolve) =>
  setTimeout(resolve, 3000)
);

            console.log(
              "Generating Firebase token..."
            );

            fcmToken =
              await getToken(messaging, {
                vapidKey:
                  import.meta.env
                    .VITE_FIREBASE_VAPID_KEY,

                serviceWorkerRegistration:
                  registration,
              });

            console.log(
              "FCM TOKEN:",
              fcmToken
            );

          } else {

            console.warn(
              "Notification permission denied"
            );
          }
        }

      } catch (tokenErr) {

        console.error(
          "FCM token generation failed:",
          tokenErr
        );

      } finally {

        console.groupEnd();
      }

      // =====================================================
      // SAVE TOKEN TO BACKEND
      // =====================================================
      if (fcmToken) {

        try {

          console.group(
            "SAVE TOKEN API"
          );

          console.log(
            "Saving admin token..."
          );

          const saveTokenRes =
            await fetch(
              `${BASE_URLS.admin}/api/save_token`,
              {
                method: "POST",
                credentials: "include",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  user_id:
                    adminData.admin_id,

                  fcm_token:
                    fcmToken,

                  device_type: "web",

                  role: "ADMIN",
                }),
              }
            );

          const saveTokenData =
            await saveTokenRes.json();

          console.log(
            "Save token response:",
            saveTokenData
          );

          if (saveTokenRes.ok) {

            console.log(
              "Admin token saved successfully"
            );

          } else {

            console.error(
              "Token save failed:",
              saveTokenData
            );
          }

        } catch (saveErr) {

          console.error(
            "Save token API failed:",
            saveErr
          );

        } finally {

          console.groupEnd();
        }
      }

      // =====================================================
      // NAVIGATE
      // =====================================================
      console.log(
        "Navigating to admin dashboard..."
      );

      setTimeout(() => {

        navigate("/admin/home", {
          replace: true,
        });

      }, 300);

    } catch (err) {

      console.error(
        "OTP verify exception:",
        err
      );

      setError(
        "OTP verification failed"
      );

    } finally {

      setLoading(false);

      console.groupEnd();
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        <div className="contract-header"></div>

        <div className="login-title">
          {step === "login"
            ? "Admin Login"
            : "Verify OTP"}
        </div>

        <div className="login-key">
          <img
            src="/assets/images/key.png"
            alt="Key"
          />
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {step === "login" ? (

          <form onSubmit={handleLoginSubmit}>

            <div className="hw-input">
              <input
                type="email"
                placeholder="Admin Email ID"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetCredentialTimer();
                }}
                disabled={loading}
              />
            </div>

            <div className="hw-input">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  resetCredentialTimer();
                }}
                disabled={loading}
              />

              <span
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </span>

            </div>

            <button
              className="go-btn"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : "Login"}
            </button>

          </form>

        ) : (

          <form onSubmit={handleOtpSubmit}>

            <div className="hw-input">

              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                maxLength="6"
                onChange={(e) =>
                  setOtp(e.target.value)
                }
                disabled={loading}
              />

            </div>

            <button
              className="go-btn"
              disabled={loading}
            >
              {loading
                ? "Verifying..."
                : "Verify OTP"}
            </button>


            <div className="resend-container">
            {canResend ? (
  <button
    type="button"
    className="resend-btn"
    onClick={handleResendOtp}
  >
    Resend OTP
  </button>
  ) : (
    <span>Resend OTP in {countdown}s</span>
  )}
</div>

            

          </form>
        )}
      </div>
    </div>
  );
}

export default AdminLogin;