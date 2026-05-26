import React, { useEffect, useState } from "react";
import { useContractor } from "../../context/ContractorContext";
import { useNavigate } from "react-router-dom";
import { BASE_URLS } from "../../api";

import "./css/CompanyProfile.css";

function ContractorBankDetails() {
  const { contractor } = useContractor();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    swift: "",
    holderName: "",
    accountNumber: "",
  });

  const [bankStatement, setBankStatement] = useState(null);
  const [existingStatement, setExistingStatement] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Malaysian banks list
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

  // ✅ Fetch profile + bank data
  const fetchProfile = async () => {
    try {
      const res = await fetch(
        `${BASE_URLS.user}/api/contractor/company_profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: contractor.email_id }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setProfile(data);

        if (data.bank_details) {
          setBankDetails({
            bankName: data.bank_details.bank_name || "",
            swift: data.bank_details.swift_code || "",
            holderName: data.bank_details.holder_name || "",
            accountNumber: data.bank_details.account_number || "",
          });

          // ✅ Existing statement
          if (data.bank_details.bank_statement_path) {
            setExistingStatement(
              data.bank_details.bank_statement_path
            );
          }
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  useEffect(() => {
    if (contractor) fetchProfile();
  }, [contractor]);

  // ✅ Validate form
  const validateBank = () => {
    const swiftRegex =
      /^[A-Z]{4}MY[A-Z0-9]{2}([A-Z0-9]{3})?$/;

    const accountRegex = /^[0-9]{6,20}$/;

    if (!bankDetails.bankName) {
      alert("Please select bank name.");
      return false;
    }

    if (!bankDetails.holderName.trim()) {
      alert("Account holder name is required.");
      return false;
    }

    if (!accountRegex.test(bankDetails.accountNumber)) {
      alert("Account number must be 6 to 20 digits.");
      return false;
    }

    if (
      !swiftRegex.test(
        bankDetails.swift.toUpperCase()
      )
    ) {
      alert("Invalid SWIFT code format.");
      return false;
    }

    if (!bankStatement && !existingStatement) {
      alert("Please upload bank statement.");
      return false;
    }

    return true;
  };

  // ✅ Submit bank update
  const handleBankSubmit = async (e) => {
    e.preventDefault();

    if (!validateBank()) return;

    setLoading(true);
    setSuccessMessage("");

    const fd = new FormData();

    fd.append("email", contractor.email_id);
    fd.append("bank_name", bankDetails.bankName);
    fd.append(
      "swift",
      bankDetails.swift.toUpperCase()
    );
    fd.append(
      "holder_name",
      bankDetails.holderName
    );
    fd.append(
      "account_number",
      bankDetails.accountNumber
    );

    if (bankStatement) {
      fd.append("bank_statement", bankStatement);
    }

    try {
      const res = await fetch(
        `${BASE_URLS.user}/api/contractor/update_company_bank`,
        {
          method: "POST",
          body: fd,
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Bank details updated successfully!");

        setSuccessMessage(
          "Bank details updated successfully!"
        );

        fetchProfile();

        setTimeout(() => {
          navigate(
            "/contractor/dashboard/updatecompanyprofile"
          );
        }, 1000);

      } else {
        alert(data.error || "Update failed");
      }

    } catch (err) {
      alert("Server error updating bank");

    } finally {
      setLoading(false);
    }
  };

  if (!contractor) {
    return (
      <div className="text-center text-danger">
        Please login to continue
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="card shadow-sm p-4 rounded">

        <h3 className="text-primary mb-3">
          Company Bank Details
        </h3>

        {/* ✅ Bank Update Form */}
        <form onSubmit={handleBankSubmit}>

          {/* Bank Name */}
          <div className="mb-3">
            <label className="form-label">
              Bank Name{" "}
              <span className="required-asterisk">
                *
              </span>
            </label>

            <select
              className="form-select"
              value={bankDetails.bankName}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  bankName: e.target.value,
                })
              }
            >
              <option value="">
                Select Bank
              </option>

              {malaysianBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Swift */}
          <div className="mb-3">
            <label className="form-label">
              SWIFT Code{" "}
              <span className="required-asterisk">
                *
              </span>
            </label>

            <input
              className="form-control"
              value={bankDetails.swift}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  swift: e.target.value,
                })
              }
            />
          </div>

          {/* Holder */}
          <div className="mb-3">
            <label className="form-label">
              Account Holder Name{" "}
              <span className="required-asterisk">
                *
              </span>
            </label>

            <input
              className="form-control"
              value={bankDetails.holderName}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  holderName: e.target.value,
                })
              }
            />
          </div>

          {/* Account */}
          <div className="mb-3">
            <label className="form-label">
              Account Number{" "}
              <span className="required-asterisk">
                *
              </span>
            </label>

            <input
              className="form-control"
              value={bankDetails.accountNumber}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  accountNumber: e.target.value,
                })
              }
            />
          </div>

          {/* Statement */}
          <div className="mb-3">
            <label className="form-label">
              Bank Statement{" "}
              <span className="required-asterisk">
                *
              </span>
            </label>

            <input
              type="file"
              className="form-control"
              accept="application/pdf,image/*"
              onChange={(e) =>
                setBankStatement(e.target.files[0])
              }
            />

            {/* ✅ Existing Bank Statement Preview */}
            {existingStatement && (
              <div className="mb-3 mt-3">

                <label className="form-label">
                  Current Bank Statement
                </label>

                <div
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px",
                    borderRadius: "8px",
                    width: "100%",
                  }}
                >
                  <a
                    href={`${BASE_URLS.user}${existingStatement}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-primary btn-sm"
                  >
                    View Current Statement
                  </a>

                  <p
                    className="text-muted mt-2 mb-0"
                    style={{ fontSize: "13px" }}
                  >
                    Existing Statement File
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading
              ? "Updating..."
              : "Update Bank Details"}
          </button>

          {/* Success Message */}
          {successMessage && (
            <p className="text-success mt-2 text-center">
              {successMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ContractorBankDetails;