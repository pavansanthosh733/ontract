import React from "react";

function CompanyInfoSection({ formData, errors, handleFormChange }) {
  return (
    <>
      <div className="col-12"><h3>Company Details</h3></div>

      <div className="col-md-6">
        <label className="form-label">Company Name <span className="required-asterisk">*</span></label>
        <input
          name="company_name"
          className={`form-control ${errors.company_name ? "is-invalid" : ""}`}
          value={formData.company_name}
          onChange={handleFormChange}
        />
        {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">BRN Number<span className="required-asterisk">*</span></label>
        <input
          name="brn_number"
          className={`form-control ${errors.brn_number ? "is-invalid" : ""}`}
          value={formData.brn_number}
          onChange={handleFormChange}
        />
        {errors.brn_number && <div className="invalid-feedback">{errors.brn_number}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">TIN Number<span className="required-asterisk">*</span></label>
        <input
          name="tin_number"
          className={`form-control ${errors.tin_number ? "is-invalid" : ""}`}
          value={formData.tin_number}
          onChange={handleFormChange}
        />
        {errors.tin_number && <div className="invalid-feedback">{errors.tin_number}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">Bumiputera <span className="required-asterisk">*</span></label>
        <select
          name="bumiputera"
          className={`form-select ${errors.bumiputera ? "is-invalid" : ""}`}
          value={formData.bumiputera}
          onChange={handleFormChange}
        >
          <option value="">Select</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        {errors.bumiputera && <div className="invalid-feedback">{errors.bumiputera}</div>}
      </div>
    </>
  );
}

export default CompanyInfoSection;