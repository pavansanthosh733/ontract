import React from "react";

function AddressSection({
  formData,
  setFormData,
  errors,
  handleFormChange,
  mailingPostalCode,
  setMailingPostalCode,
  billingPostalCode,
  setBillingPostalCode,
  sameAsMailing,
  setSameAsMailing,
  fetchAndAppend,
  regions,
  mailingRegionId,
  setMailingRegionId,
  mailingStateId,
  setMailingStateId,
  mailingCityId,
  setMailingCityId,
  mailingStates,
  mailingCities,
  fetchMailingStates,
  fetchMailingCities,
}) {
  return (
    <>
      {/* Mailing Postal Code + Address */}
      <div className="col-md-12">
        <label className="form-label">
          Mailing Postal Code <span className="required-asterisk">*</span>
        </label>
        <input
          type="text"
          className={`form-control ${errors.mailingPostalCode ? "is-invalid" : ""}`}
          value={mailingPostalCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setMailingPostalCode(value);
            if (sameAsMailing) setBillingPostalCode(value);
          }}
          onBlur={() => fetchAndAppend("mailing", mailingPostalCode)}
          placeholder="e.g., 50450"
          maxLength={5}
        />
        {errors.mailingPostalCode && (
          <div className="invalid-feedback d-block">{errors.mailingPostalCode}</div>
        )}
      </div>

      <div className="col-md-12">
        <label className="form-label">
          Mailing Address <span className="required-asterisk">*</span>
        </label>
        <textarea
          name="mailing_address"
          className={`form-control ${errors.mailing_address ? "is-invalid" : ""}`}
          rows="2"
          value={formData.mailing_address}
          onChange={(e) => {
            handleFormChange(e);
            if (sameAsMailing) {
              setFormData((prev) => ({ ...prev, billing_address: e.target.value }));
            }
          }}
          placeholder="Enter street address; city/state auto-appends after postal code."
        />
        {errors.mailing_address && (
          <div className="invalid-feedback d-block">{errors.mailing_address}</div>
        )}
      </div>

      {/* SAME AS MAILING CHECKBOX */}
      <div className="col-md-12">
        <div className="form-check mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="sameAddress"
            checked={sameAsMailing}
            onChange={(e) => {
              const checked = e.target.checked;
              setSameAsMailing(checked);
              if (checked) {
                setFormData((prev) => ({ ...prev, billing_address: prev.mailing_address }));
                setBillingPostalCode(mailingPostalCode);
              }
            }}
          />
          <label className="form-check-label" htmlFor="sameAddress">
            Billing Address same as Mailing Address
          </label>
        </div>
      </div>

      {/* Mailing Region */}

   <div className="col-12 mt-3">
  <h5 className="fw-bold text-dark">
    Location Details <span className="required-asterisk">*</span>
  </h5>
</div>
<div className="col-md-4">
  <label className="form-label">
    Region <span className="required-asterisk">*</span>
  </label>

  <select
    className="form-select"
    value={mailingRegionId}
    onChange={async (e) => {
      const regionId = e.target.value;

      setMailingRegionId(regionId);
      setMailingStateId("");
      setMailingCityId("");

      if (regionId) {
        await fetchMailingStates(regionId);
      }
    }}
  >
    <option value="">Select Region</option>
    {regions.map((region) => (
      <option key={region.region_id} value={region.region_id}>
        {region.region_name}
      </option>
    ))}
  </select>
</div>

{/* Mailing State */}
<div className="col-md-4">
  <label className="form-label">
    State <span className="required-asterisk">*</span>
  </label>

  <select
    className="form-select"
    value={mailingStateId}
    disabled={!mailingRegionId}
    onChange={async (e) => {
      const stateId = e.target.value;

      setMailingStateId(stateId);
      setMailingCityId("");

      if (stateId) {
        await fetchMailingCities(mailingRegionId, stateId);
      }
    }}
  >
    <option value="">Select State</option>

    {mailingStates.map((state) => (
      <option key={state.state_id} value={state.state_id}>
        {state.state_name}
      </option>
    ))}
  </select>
</div>

{/* Mailing City */}
<div className="col-md-4">
  <label className="form-label">
    City <span className="required-asterisk">*</span>
  </label>

  <select
    className="form-select"
    value={mailingCityId}
    disabled={!mailingStateId}
    onChange={(e) => setMailingCityId(e.target.value)}
  >
    <option value="">Select City</option>

    {mailingCities.map((city) => (
      <option key={city.city_id} value={city.city_id}>
        {city.city_name}
      </option>
    ))}
  </select>
</div>

      {/* Billing Postal Code + Address */}
      <div className="col-md-12">
        <label className="form-label">
          Billing Postal Code <span className="required-asterisk">*</span>
        </label>
        <input
          type="text"
          className={`form-control ${errors.billingPostalCode ? "is-invalid" : ""}`}
          value={billingPostalCode}
          disabled={sameAsMailing}
          onChange={(e) => setBillingPostalCode(e.target.value.replace(/\D/g, ""))}
          onBlur={() => fetchAndAppend("billing", billingPostalCode)}
          placeholder="e.g., 50450"
          maxLength={5}
        />
        {errors.billingPostalCode && (
          <div className="invalid-feedback d-block">{errors.billingPostalCode}</div>
        )}
      </div>

      <div className="col-md-12">
        <label className="form-label">
          Billing Address <span className="required-asterisk">*</span>
        </label>
        <textarea
          name="billing_address"
          className={`form-control ${errors.billing_address ? "is-invalid" : ""}`}
          rows="2"
          value={formData.billing_address}
          disabled={sameAsMailing}
          onChange={handleFormChange}
          placeholder="Enter street address; city/state auto-appends after postal code."
        />
        {errors.billing_address && (
          <div className="invalid-feedback d-block">{errors.billing_address}</div>
        )}
      </div>
    </>
  );
}

export default AddressSection;