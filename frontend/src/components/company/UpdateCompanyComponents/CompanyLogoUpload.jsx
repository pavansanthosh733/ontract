import React from "react";

function CompanyLogoUpload({ errors, handleCompanyLogoChange }) {
  return (
    <div className="col-md-6">
      <label className="form-label">Company Logo <span className="required-asterisk">*</span></label>
      <input
        type="file"
        className={`form-control ${errors.companyLogo ? "is-invalid" : ""}`}
        accept="image/*"
        onChange={handleCompanyLogoChange}
        required
      />
      {errors.companyLogo && <div className="invalid-feedback d-block">{errors.companyLogo}</div>}
    </div>
  );
}

export default CompanyLogoUpload;