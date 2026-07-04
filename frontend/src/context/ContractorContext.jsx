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

  /* =====================================================
     REFRESH CONTRACTOR SESSION
  ===================================================== */

  const refreshContractorSession = async () => {
    console.group("🔄 Manual Contractor Session Refresh");

    try {
      const data = await apiPost("/api/contractor/refresh", {});

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

  /* =====================================================
     RESTORE SESSION ON APP START
  ===================================================== */

  useEffect(() => {
    if (didRestore.current) {
      console.log("⏭️ Skipping duplicate restoreSession call");
      return;
    }

    didRestore.current = true;

    console.group("🧠 ContractorContext Init");

    const restoreSession = async () => {
      try {
        // Fast UI restore
        const stored = localStorage.getItem("contractor");

        // No contractor stored → don't call refresh
        if (!stored) {
            setLoading(false);
            return;
        }

        const parsed = JSON.parse(stored);
        setContractor(parsed);

        // Only now validate session
        const data = await apiPost("/api/contractor/refresh", {});

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
          localStorage.removeItem("role");
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

  /* =====================================================
     LOGIN CONTRACTOR
  ===================================================== */

 const loginContractor = (contractorData) => {
    setContractor(contractorData);

    localStorage.setItem(
        "contractor",
        JSON.stringify(contractorData)
    );

    localStorage.setItem("role", "contractor");
};

  /* =====================================================
     LOGOUT CONTRACTOR
  ===================================================== */

 const logoutContractor = async () => {
  try {
    await apiPost("/api/contractor/logout", {});
  } catch (err) {
    console.error("Contractor logout failed:", err);
  } finally {
    setContractor(null);

    localStorage.removeItem("contractor");
    localStorage.removeItem("role");
  }
};

  /* =====================================================
     CONTEXT PROVIDER
  ===================================================== */

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
   CUSTOM HOOK
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