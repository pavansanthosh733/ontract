import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiPost } from "../api";

/* =====================================================
   CONTRACTOR CONTEXT
===================================================== */
const ContractorContext = createContext(null);

/* =====================================================
   PROVIDER
===================================================== */
export const ContractorProvider = ({ children }) => {
  const [contractor, setContractor] = useState(null);
  const [loading, setLoading] = useState(true);

  const didRestore = useRef(false);

  /* -------------------------------------------
     REUSABLE REFRESH SESSION
  -------------------------------------------- */
  const refreshContractorSession = async () => {
    console.group("🔄 Manual Contractor Session Refresh");

    try {
      const data = await apiPost("/api/contractor/refresh_token", {});

      // ✅ 🔥 UPDATE TOKEN (CRITICAL)
      if (data?.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      if (data?.contractor) {
        console.log("✅ Contractor restored from backend");

        setContractor(data.contractor);

        localStorage.setItem(
          "contractor",
          JSON.stringify(data.contractor)
        );
      }

      console.groupEnd();
      return data;
    } catch (err) {
      console.error("❌ Manual refresh failed", err);
      console.groupEnd();
      throw err;
    }
  };

  /* -------------------------------------------
     RESTORE CONTRACTOR SESSION ON APP START
  -------------------------------------------- */
  useEffect(() => {
    if (didRestore.current) {
      console.log("⏭️ Skipping duplicate restoreSession call");
      return;
    }

    didRestore.current = true;
    console.group("🧠 ContractorContext Init");

    const restoreSession = async () => {
      try {
        // ✅ Fast UI restore
        const stored = localStorage.getItem("contractor");

        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("⚡ Fast restore from localStorage", parsed);
          setContractor(parsed);
        }

        // ✅ Backend validation
        const data = await apiPost("/api/contractor/refresh_token", {});

        // ✅ 🔥 UPDATE TOKEN (CRITICAL)
        if (data?.refresh_token) {
          localStorage.setItem("refresh_token", data.refresh_token);
        }

        if (data?.contractor) {
          console.log("🔐 Contractor restored from backend");

          setContractor(data.contractor);

          localStorage.setItem(
            "contractor",
            JSON.stringify(data.contractor)
          );
        }
      } catch (err) {
        const msg = err?.message || "";

        const isExpectedNoSession =
          msg.includes("Refresh token missing") ||
          msg.includes("Session expired") ||
          msg.includes("logged out") ||
          msg.includes("401");

        if (isExpectedNoSession) {
          console.log("ℹ️ No active contractor session");

          setContractor(null);
          localStorage.removeItem("contractor");
          localStorage.removeItem("refresh_token"); // 🔥 IMPORTANT
        } else {
          console.error(
            "⚠️ Temporary backend issue, keeping cached contractor",
            err
          );
        }
      } finally {
        setLoading(false);
        console.groupEnd();
      }
    };

    restoreSession();
  }, []);

  /* -------------------------------------------
     LOGIN CONTRACTOR
  -------------------------------------------- */
  const loginContractor = (contractorData) => {
    console.group("🔐 Contractor Login");

    setContractor(contractorData);

    localStorage.setItem(
      "contractor",
      JSON.stringify(contractorData)
    );

    console.log("✅ Contractor saved in context + localStorage");
    console.groupEnd();
  };

  /* -------------------------------------------
     LOGOUT CONTRACTOR
  -------------------------------------------- */
  const logoutContractor = async () => {
    console.group("🚪 Contractor Logout");

    try {
      await apiPost("/api/contractor/logout", {});
      console.log("✅ Backend session revoked");
    } catch (err) {
      console.error("❌ Logout API failed", err);
    } finally {
      setContractor(null);

      // ✅ 🔥 CLEAN EVERYTHING
      localStorage.removeItem("contractor");
      localStorage.removeItem("refresh_token");

      console.log("✅ Frontend cleared");
      console.groupEnd();
    }
  };

  return (
    <ContractorContext.Provider
      value={{
        contractor,
        setContractor,
        loginContractor,
        logoutContractor,
        refreshContractorSession,
        loading,
      }}
    >
      {children}
    </ContractorContext.Provider>
  );
};

/* =====================================================
   HOOK
===================================================== */
export const useContractor = () => {
  const ctx = useContext(ContractorContext);

  if (!ctx) {
    throw new Error(
      "useContractor must be used inside ContractorProvider"
    );
  }

  return ctx;
};