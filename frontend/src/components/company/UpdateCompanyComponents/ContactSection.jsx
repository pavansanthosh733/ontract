import React from "react";

function ContactSection({ formData, errors, handleFormChange }) {
  return (
    <>
      <div className="col-md-6">
        <label className="form-label">Contact Number<span className="required-asterisk">*</span></label>
        <input
          name="contact_number"
          className={`form-control ${errors.contact_number ? "is-invalid" : ""}`}
          value={formData.contact_number}
          onChange={handleFormChange}
        />
        {errors.contact_number && <div className="invalid-feedback">{errors.contact_number}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">Alternate Contact</label>
        <input
          name="alternate_contact"
          className={`form-control ${errors.alternate_contact ? "is-invalid" : ""}`}
          value={formData.alternate_contact}
          onChange={handleFormChange}
        />
        {errors.alternate_contact && <div className="invalid-feedback">{errors.alternate_contact}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">Contact Person<span className="required-asterisk">*</span></label>
        <input
          name="contact_person"
          className={`form-control ${errors.contact_person ? "is-invalid" : ""}`}
          value={formData.contact_person}
          onChange={handleFormChange}
        />
        {errors.contact_person && <div className="invalid-feedback">{errors.contact_person}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label">Email (read-only)</label>
        <input name="email_id" className="form-control" value={formData.email_id} onChange={handleFormChange} disabled />
      </div>
    </>
  );
}

export default ContactSection;