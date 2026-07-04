import React, { createContext, useContext, useEffect, useState } from "react";

import { apiPost } from "../api";

/* =====================================================
   ADMIN CONTEXT
===================================================== */
const AdminContext = createContext(null);

/* =====================================================
   PROVIDER
===================================================== */
export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------
     LOAD ADMIN FROM LOCALSTORAGE ON APP LOAD
  -------------------------------------------- */
  useEffect(() => {
    console.group("🧠 AdminContext Init");

    try {
      const storedAdmin = localStorage.getItem("admin");

      if (storedAdmin) {
        const parsed = JSON.parse(storedAdmin);

        console.log("✅ Admin loaded from localStorage:", parsed);

        setAdmin(parsed);
      } else {
        console.log("ℹ️ No admin in localStorage");
      }
    } catch (err) {
      console.error("❌ Failed to parse admin", err);

      localStorage.removeItem("admin");
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  }, []);

  /* -------------------------------------------
     LOGIN ADMIN
  -------------------------------------------- */
 const loginAdmin = (adminData) => {
    console.group("🔐 Admin Login");

    console.log("Admin data received:", adminData);

    // Save the token separately for Authorization header use
    if (adminData.access_token) {
      localStorage.setItem("admin_token", adminData.access_token);
      console.log("✅ admin_token saved to localStorage");
    } else {
      console.warn("⚠️ No access_token received from backend");
    }

    // Keep ALL admin fields
    const safeData = {
      ...adminData,
    };

    // Remove sensitive fields only if present
    delete safeData.password_hash;
    delete safeData.access_token;

    console.log("✅ Safe data:", safeData);

    setAdmin(safeData);

    localStorage.setItem(
      "admin",
      JSON.stringify(safeData)
    );

    console.groupEnd();
  };

/* -------------------------------------------
     LOGOUT ADMIN
  -------------------------------------------- */
  const logoutAdmin = async () => {
    console.group("🚪 Admin Logout");

    try {
      // Backend will:
      // 1. Read HttpOnly cookie
      // 2. Revoke JWT
      // 3. Insert into revoked_tokens_t
      // 4. Delete cookie
      await apiPost("/api/admin/logout", {});

      console.log("✅ Backend logout successful");
    } catch (err) {
      console.error("❌ Logout API failed", err);
    } finally {
      // Clear frontend state
      setAdmin(null);

      // Remove cached admin profile
      localStorage.removeItem("admin");

      console.log("✅ Frontend logout complete");

      console.groupEnd();
    }
  };

  return (
    <AdminContext.Provider
      value={{
        admin,
        loginAdmin,
        logoutAdmin,
        loading,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

/* =====================================================
   HOOK
===================================================== */
export const useAdmin = () => {
  const ctx = useContext(AdminContext);

  if (!ctx) {
    throw new Error(
      "useAdmin must be used inside AdminProvider"
    );
  }

  return ctx;
};