import React from "react";

function CertificateUpload({ errors, handleCertificateChange }) {
  return (
    <div className="col-md-6">
      <label className="form-label">Certificate <span className="required-asterisk">*</span></label>
      <input
        type="file"
        multiple
        className={`form-control ${errors.certificate ? "is-invalid" : ""}`}
        accept="image/*,application/pdf"
        onChange={handleCertificateChange}
        required
      />
      {errors.certificate && <div className="invalid-feedback d-block">{errors.certificate}</div>}
    </div>
  );
}

export default CertificateUpload;