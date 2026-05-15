import React, { useEffect, useState } from "react";
import "./css/ProviderProfile.css";
import { apiPost, BASE_URLS } from "../api";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

function ProviderBankDetails() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    holderName: "",
    accountNumber: "",
    swift: "",
  });

  const [existingStatement, setExistingStatement] = useState(false);
  const [bankStatement, setBankStatement] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [statementPreview, setStatementPreview] = useState(null);
  const [statementType, setStatementType] = useState(null); // "image" | "pdf"


  const malaysianBanks = [
    "Maybank",
    "CIMB Bank",
    "Public Bank",
    "RHB Bank",
    "Hong Leong Bank",
    "AmBank",
    "Standard Chartered Bank Malaysia",
    "HSBC Bank Malaysia",
    "UOB Malaysia",
    "OCBC Bank Malaysia",
  ];

  // --------------------------------------
  // LOAD EXISTING BANK DETAILS
  // --------------------------------------
 useEffect(() => {
  if (!user) return;

  const fetchProfile = async () => {
    try {
      const data = await apiPost("/api/profile", {
        email: user.email_id,
      });

      if (data.bank_details) {
        // ✅ Fill form fields
        setBankDetails({
          bankName: data.bank_details.bank_name || "",
          holderName: data.bank_details.holder_name || "",
          accountNumber: data.bank_details.bank_account_number || "",
          swift: data.bank_details.swift || "",
        });

        // ✅ Handle existing statement
        if (data.bank_details.bank_statement) {
          setExistingStatement(true);

          const base64 = data.bank_details.bank_statement;

          // 🔍 Detect file type from base64 header
          if (base64.startsWith("/9j")) {
            // JPEG
            setStatementType("image");
            setStatementPreview(`data:image/jpeg;base64,${base64}`);
          } else if (base64.startsWith("iVBOR")) {
            // PNG
            setStatementType("image");
            setStatementPreview(`data:image/png;base64,${base64}`);
          } else if (base64.startsWith("JVBER")) {
            // PDF
            setStatementType("pdf");
            setStatementPreview(`data:application/pdf;base64,${base64}`);
          } else {
            console.warn("Unknown bank statement format");
          }
        }
      }
    } catch (err) {
      console.error("Bank profile load error", err);
    }
  };

  fetchProfile();
}, [user]);

  // --------------------------------------
  // FILE CHANGE
  // --------------------------------------
  const handleBankStatementChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors({ bankStatement: "Only PDF, JPG or PNG allowed" });
      return;
    }

    setBankStatement(file);
    setErrors({});
  };

  // --------------------------------------
  // VALIDATION
  // --------------------------------------
  const validate = () => {
    const newErrors = {};
    const swiftRegex = /^([A-Z]{4}MY[A-Z0-9]{2})([A-Z0-9]{3})?$/;
    const accountRegex = /^[0-9]{9,18}$/;

    if (!bankDetails.bankName) newErrors.bankName = "Bank required";
    if (!bankDetails.holderName) newErrors.holderName = "Holder name required";
    if (!accountRegex.test(bankDetails.accountNumber))
      newErrors.accountNumber = "Invalid account number";
    if (!swiftRegex.test(bankDetails.swift))
      newErrors.swift = "Invalid SWIFT code";

    // ✅ Statement required ONLY if not already uploaded
    if (!existingStatement && !bankStatement) {
      newErrors.bankStatement = "Statement required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --------------------------------------
  // SUBMIT
  // --------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("email", user.email_id);
    formData.append("bank_name", bankDetails.bankName);
    formData.append("holder_name", bankDetails.holderName);
    formData.append("account_number", bankDetails.accountNumber);
    formData.append("swift", bankDetails.swift);

    if (bankStatement) {
      formData.append("bank_statement", bankStatement);
    }

    try {
      await apiPost("/api/update_bank", formData);
      setSuccessMessage("Bank details updated successfully");
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      setErrors({ general: err.message || "Submission failed" });
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------
  // UI
  // --------------------------------------
  return (
    <div className="provider-container">
      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-12 text-center mb-3">
          <h2>Edit Bank Details</h2>
        </div>

        <div className="col-md-6">
          <label className="form-label">Bank</label>
          <select
            className={`form-select ${errors.bankName ? "is-invalid" : ""}`}
            value={bankDetails.bankName}
            onChange={(e) =>
              setBankDetails({ ...bankDetails, bankName: e.target.value })
            }
          >
            <option value="">Select</option>
            {malaysianBanks.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <div className="invalid-feedback">{errors.bankName}</div>
        </div>

        <div className="col-md-6">
          <label className="form-label">Holder Name</label>
          <input
            className={`form-control ${errors.holderName ? "is-invalid" : ""}`}
            value={bankDetails.holderName}
            onChange={(e) =>
              setBankDetails({ ...bankDetails, holderName: e.target.value })
            }
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Account Number</label>
          <input
            className={`form-control ${errors.accountNumber ? "is-invalid" : ""}`}
            value={bankDetails.accountNumber}
            onChange={(e) =>
              setBankDetails({ ...bankDetails, accountNumber: e.target.value })
            }
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">SWIFT Code</label>
          <input
            className={`form-control ${errors.swift ? "is-invalid" : ""}`}
            value={bankDetails.swift}
            onChange={(e) =>
              setBankDetails({
                ...bankDetails,
                swift: e.target.value.toUpperCase(),
              })
            }
          />
        </div>

        <div className="col-12">
          <label className="form-label">Bank Statement</label>


          <input
            type="file"
            className={`form-control ${
              errors.bankStatement ? "is-invalid" : ""
            }`}
            onChange={handleBankStatementChange}
          />
          <div className="invalid-feedback d-block">
            {errors.bankStatement}
          </div>
          {existingStatement && statementPreview && (
  <div className="mb-2">
    <small className="text-success d-block mb-1">
      ✔ Statement already uploaded
    </small>

    {statementType === "image" && (
      <img
        src={statementPreview}
        alt="Bank Statement"
        style={{ maxWidth: "220px", border: "1px solid #ccc" }}
      />
    )}

    {statementType === "pdf" && (
      <a
        href={statementPreview}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm btn-outline-primary"
      >
        View Bank Statement
      </a>
    )}
  </div>
)}

        </div>

        <div className="col-12">
          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Saving..." : "Update Bank Details"}
          </button>
        </div>

        {errors.general && (
          <div className="text-danger text-center">{errors.general}</div>
        )}

        {successMessage && (
          <div className="text-success text-center">{successMessage}</div>
        )}
      </form>
    </div>
  );
}

export default ProviderBankDetails;
