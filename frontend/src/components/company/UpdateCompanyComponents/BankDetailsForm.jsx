import React from "react";

function BankDetailsForm({
  bankDetails,
  setBankDetails,
  errors,
  malaysianBanks,
  handleBankStatementChange,
  handleBankSubmit,
  loading,
}) {
  return (
    <form onSubmit={handleBankSubmit} className="row g-3">
      <div className="col-12"><h3>Company Bank Details</h3></div>

      <div className="col-md-6">
        <label className="form-label">Bank Name<span className="required-asterisk">*</span></label>
        <select
          className={`form-select ${errors.bankName ? "is-invalid" : ""}`}
          value={bankDetails.bankName}
          onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
        >
          <option value="">Select</option>
          {malaysianBanks.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">SWIFT Code<span className="required-asterisk">*</span></label>
        <input
          className={`form-control ${errors.swift ? "is-invalid" : ""}`}
          value={bankDetails.swift}
          onChange={(e) => setBankDetails({ ...bankDetails, swift: e.target.value.toUpperCase() })}
        />
        {errors.swift && <div className="invalid-feedback">{errors.swift}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">Account Holder Name<span className="required-asterisk">*</span></label>
        <input
          className={`form-control ${errors.holderName ? "is-invalid" : ""}`}
          value={bankDetails.holderName}
          onChange={(e) => setBankDetails({ ...bankDetails, holderName: e.target.value })}
        />
        {errors.holderName && <div className="invalid-feedback">{errors.holderName}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">Account Number<span className="required-asterisk">*</span></label>
        <input
          className={`form-control ${errors.accountNumber ? "is-invalid" : ""}`}
          value={bankDetails.accountNumber}
          onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
        />
        {errors.accountNumber && <div className="invalid-feedback">{errors.accountNumber}</div>}
      </div>

      <div className="col-12">
        <label className="form-label">Bank Statement <span className="required-asterisk">*</span></label>
        <input
          type="file"
          className={`form-control ${errors.bankStatement ? "is-invalid" : ""}`}
          accept="application/pdf,image/*"
          onChange={handleBankStatementChange}
          required
        />
        {errors.bankStatement && <div className="invalid-feedback d-block">{errors.bankStatement}</div>}
      </div>

      <div className="col-12">
        <button className="btn btn-primary w-100" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Bank Details"}
        </button>
        {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
      </div>
    </form>
  );
}

export default BankDetailsForm;