import React, { createContext, useContext, useEffect, useState } from "react";

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

    // Admin now uses HttpOnly cookie
    localStorage.removeItem("admin_token");

    console.groupEnd();
  };

  /* -------------------------------------------
     LOGOUT ADMIN
  -------------------------------------------- */
  const logoutAdmin = () => {
    console.group("🚪 Admin Logout");

    setAdmin(null);

    localStorage.removeItem("admin");
    localStorage.removeItem("admin_token");

    console.log("✅ Admin logged out");

    console.groupEnd();
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
