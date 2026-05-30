import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./css/CompanyOTPVerification.css";
import { apiPost } from "../../api";
import { useContractor } from "../../context/ContractorContext";
import { getToken } from "firebase/messaging";
import { messaging } from "../../firebase";

function CompanyOTPVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const { loginContractor } = useContractor();

  /* =========================
     VERIFY OTP
  ========================= */
 
  const handleVerify = async (e) => {
  e.preventDefault();

  setError("");
  setMessage("");
  setLoading(true);

  console.clear();

  console.group("🔐 CONTRACTOR OTP VERIFY FLOW");

  try {
    // =====================================================
    // STEP 1️⃣ VERIFY OTP API
    // =====================================================
    console.log("STEP 1️⃣ : Calling verify OTP API...");

    const data = await apiPost("/api/contractor/verify_otp", {
      email,
      otp,
    });

    console.log("STEP 2️⃣ : API response received");
    console.log("FULL API RESPONSE =>", data);

    // =====================================================
    // STEP 2️⃣ VERIFY SUCCESS
    // =====================================================
    if (data?.contractor) {
      console.log("✅ STEP 3️⃣ : OTP VERIFIED SUCCESSFULLY");

      // =====================================================
      // STEP 3️⃣ STORE REFRESH TOKEN
      // =====================================================
      if (data?.refresh_token) {
        console.log("💾 Saving refresh token to localStorage");

        localStorage.setItem("refresh_token", data.refresh_token);

        console.log("✅ Refresh token saved");
      } else {
        console.warn("⚠️ No refresh token received from backend");
      }

      // =====================================================
      // STEP 4️⃣ PREPARE CONTRACTOR DATA
      // =====================================================
      const contractorData = {
        ...data.contractor,
        role: "CONTRACTOR",
      };

      console.log("👤 CONTRACTOR DATA =>", contractorData);

      // =====================================================
      // STEP 5️⃣ SAVE USER IN CONTEXT
      // =====================================================
      console.log("🧠 Saving contractor in context");

      loginContractor(contractorData);

      console.log("✅ Contractor saved in context");

      // =====================================================
      // STEP 6️⃣ CHECK PLATFORM
      // =====================================================
      console.log("🌍 Checking platform...");

      if (window.flutter_inappwebview) {
        // =====================================================
        // MOBILE FLOW
        // =====================================================
        console.log("📱 Flutter app detected");

        try {
          await window.flutter_inappwebview.callHandler(
            "sendUserToFlutter",
            contractorData.user_uid.toString(),
            "CONTRACTOR"
          );

          console.log("✅ Contractor sent to Flutter successfully");
        } catch (flutterErr) {
          console.error("❌ Flutter handler error =>", flutterErr);
        }
      } else {
        // =====================================================
        // WEB FLOW
        // =====================================================
        console.log("🌐 Running in WEB browser");

        let fcmToken = null;

        // =====================================================
        // STEP 7️⃣ CHECK NOTIFICATION SUPPORT
        // =====================================================
        console.log("🔔 Checking notification support...");

        if (!("Notification" in window)) {
          console.error("❌ Browser does not support notifications");
        } else {
          console.log("✅ Notifications supported");
        }

        // =====================================================
        // STEP 8️⃣ CHECK SERVICE WORKER
        // =====================================================
        console.log("🛠️ Checking service worker support...");

        if (!("serviceWorker" in navigator)) {
          console.error("❌ Service Worker not supported");
        } else {
          console.log("✅ Service Worker supported");
        }

        // =====================================================
        // STEP 9️⃣ REGISTER SERVICE WORKER
        // =====================================================
        let registration = null;

        try {
          console.log("📝 Registering firebase-messaging-sw.js");

          registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
          );

          console.log("✅ Service Worker Registered");
          console.log("SW REGISTRATION =>", registration);
        } catch (swError) {
          console.error("❌ Service Worker registration failed");
          console.error(swError);
        }

        // =====================================================
        // STEP 🔟 REQUEST NOTIFICATION PERMISSION
        // =====================================================
        try {
          console.log("🔐 Requesting notification permission...");

          const permission = await Notification.requestPermission();

          console.log("🔔 Notification permission =>", permission);

          if (permission === "granted") {
            console.log("✅ Permission granted");

            // =====================================================
            // STEP 1️⃣1️⃣ CHECK VAPID KEY
            // =====================================================
            console.log("🔑 Checking VAPID key...");

            console.log(
              "VAPID KEY =>",
              import.meta.env.VITE_FIREBASE_VAPID_KEY
            );

            if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
              console.error("❌ VAPID key missing in .env");
            }

            // =====================================================
            // STEP 1️⃣2️⃣ GET FCM TOKEN
            // =====================================================
            try {
              console.log("📲 Calling getToken()...");

              fcmToken = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration,
              });

              console.log("🔥 FCM TOKEN RECEIVED =>", fcmToken);

              if (!fcmToken) {
                console.error(
                  "❌ getToken returned NULL/EMPTY token"
                );
              }
            } catch (tokenError) {
              console.error("❌ getToken FAILED");
              console.error("ERROR OBJECT =>", tokenError);

              console.log(
                "🧪 Possible reasons:"
              );

              console.log(
                "1️⃣ firebase-messaging-sw.js missing"
              );

              console.log(
                "2️⃣ Invalid VAPID key"
              );

              console.log(
                "3️⃣ Firebase config incorrect"
              );

              console.log(
                "4️⃣ HTTPS required"
              );

              console.log(
                "5️⃣ Browser blocked notifications"
              );

              console.log(
                "6️⃣ Push service failure from browser"
              );
            }
          } else {
            console.warn("❌ Notification permission denied");
          }
        } catch (permissionError) {
          console.error(
            "❌ Notification permission request failed"
          );

          console.error(permissionError);
        }

        // =====================================================
        // STEP 1️⃣3️⃣ SAVE TOKEN API
        // =====================================================
        console.log("💾 Checking if token exists before save...");

        if (fcmToken) {
          console.log("✅ Token exists");

          const savePayload = {
            user_id: contractorData.user_uid,
            fcm_token: fcmToken,
            device_type: "web",
            role: "CONTRACTOR",
          };

          console.log("📦 SAVE TOKEN PAYLOAD =>", savePayload);

          try {
            console.log("📡 Calling /api/save_token API...");

            const saveResponse = await apiPost(
              "/api/save_token",
              savePayload
            );

            console.log("✅ TOKEN SAVE SUCCESS");
            console.log("SAVE TOKEN RESPONSE =>", saveResponse);
          } catch (saveErr) {
            console.error("❌ SAVE TOKEN API FAILED");
            console.error("ERROR =>", saveErr);

            if (saveErr?.response) {
              console.error(
                "BACKEND RESPONSE =>",
                saveErr.response
              );
            }
          }
        } else {
          console.error(
            "❌ save_token API NOT CALLED because fcmToken is NULL"
          );
        }
      }

      // =====================================================
      // STEP 1️⃣4️⃣ NAVIGATION
      // =====================================================
      console.log("🚀 Navigating to dashboard...");

      navigate("/contractor/dashboard/companydashboardhome", {
        replace: true,
      });

      console.log("✅ Navigation completed");
    } else {
      // =====================================================
      // OTP FAILED
      // =====================================================
      console.error("❌ OTP verification failed");

      console.log("FULL FAILURE RESPONSE =>", data);

      localStorage.removeItem("refresh_token");

      alert(data?.error || "Invalid OTP");
    }
  } catch (err) {
    // =====================================================
    // MAIN ERROR
    // =====================================================
    console.error("🚨 MAIN VERIFY ERROR");

    console.error("ERROR =>", err);

    if (err?.response) {
      console.error("SERVER RESPONSE =>", err.response);
    }

    if (err?.stack) {
      console.error("STACK TRACE =>", err.stack);
    }

    localStorage.removeItem("refresh_token");

    alert(err.message || "Verification failed");
  } finally {
    console.log("🏁 VERIFY FLOW FINISHED");

    console.groupEnd();

    setLoading(false);
  }
};
  /* =========================
     RESEND OTP
  ========================= */
  const handleResend = async () => {
    setError("");
    setMessage("");
    setResendLoading(true);

    console.group("🔁 RESEND CONTRACTOR OTP");

    try {
      const data = await apiPost("/api/contractor/resend_otp", {
        email,
      });

      console.log("RESEND RESPONSE:", data);
      alert(data?.message || "OTP resent successfully!");
    } catch (err) {
      console.error("🚨 RESEND OTP ERROR:", err);
      alert(err.message || "Failed to resend OTP.");
    } finally {
      console.groupEnd();
      setResendLoading(false);
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-card">
        <h2>OTP Verification</h2>

        <p>
          We’ve sent an OTP to <strong>{email}</strong>
        </p>

        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            maxLength={6}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button
          className="resend-btn"
          onClick={handleResend}
          disabled={resendLoading}
        >
          {resendLoading ? "Resending..." : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}

export default CompanyOTPVerification;