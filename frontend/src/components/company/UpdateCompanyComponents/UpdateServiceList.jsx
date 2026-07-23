import React from "react";

function UpdateServiceList({
  locationServiceList,
  regions,
  servicesList,
  errors,
  handleChange,
  addServiceRow,
  removeServiceRow,
}) {
  return (
    <div className="col-12">
      <h5>Locations & Services<span className="required-asterisk">*</span></h5>

      {locationServiceList.map((it, idx) => (
        <div key={idx} className="border rounded p-3 mb-3">
          {/* ROW 1 : REGION / STATE / CITY / PRICE */}
          <div className="row mb-2">
            <div className="col-md-3">
              <label className="form-label small">Region</label>
              <select
                className={`form-select ${errors[`region-${idx}`] ? "is-invalid" : ""}`}
                value={it.region_id || ""}
                onChange={(e) => {
                  const region = regions.find((r) => r.region_id == e.target.value);
                  handleChange(idx, "region", { id: region.region_id, name: region.region_name });
                }}
              >
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.region_id} value={r.region_id}>
                    {r.region_name}
                  </option>
                ))}
              </select>
              {errors[`region-${idx}`] && (
                <div className="invalid-feedback d-block">{errors[`region-${idx}`]}</div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label small">State</label>
              <select
                className={`form-select ${errors[`state-${idx}`] ? "is-invalid" : ""}`}
                value={it.state_id || ""}
                onChange={(e) => {
                  const state = it.states.find((s) => s.state_id == e.target.value);
                  handleChange(idx, "state", { id: state.state_id, name: state.state_name });
                }}
                disabled={!it.region_id}
              >
                <option value="">Select State</option>
                {it.states?.map((s) => (
                  <option key={s.state_id} value={s.state_id}>
                    {s.state_name}
                  </option>
                ))}
              </select>
              {errors[`state-${idx}`] && (
                <div className="invalid-feedback d-block">{errors[`state-${idx}`]}</div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label small">City</label>
              <select
                className={`form-select ${errors[`city-${idx}`] ? "is-invalid" : ""}`}
                value={it.city_id || ""}
                onChange={(e) => {
                  const city = it.cities.find((c) => c.city_id == e.target.value);
                  handleChange(idx, "city", { id: city.city_id, name: city.city_name });
                }}
                disabled={!it.state_id}
              >
                <option value="">Select City</option>
                {it.cities?.map((c) => (
                  <option key={c.city_id} value={c.city_id}>
                    {c.city_name}
                  </option>
                ))}
              </select>
              {errors[`city-${idx}`] && (
                <div className="invalid-feedback d-block">{errors[`city-${idx}`]}</div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label small">Price</label>
              <input
                type="number"
                min="0"
                className={`form-control ${errors[`price-${idx}`] ? "is-invalid" : ""}`}
                value={it.price || ""}
                onChange={(e) => handleChange(idx, "price", e.target.value)}
              />
              {errors[`price-${idx}`] && (
                <div className="invalid-feedback d-block">{errors[`price-${idx}`]}</div>
              )}
            </div>
          </div>

          {/* ROW 2 : CATEGORY / ITEM / TYPE / DESCRIPTION */}
          <div className="row">
            <div className="col-md-3">
              <label className="form-label small">Category</label>
              <select
                className="form-select"
                value={it.category_id || ""}
                onChange={(e) =>
                  handleChange(idx, "category", {
                    id: e.target.value,
                    name: servicesList.find((c) => c.category_id == e.target.value)?.category_name,
                  })
                }
              >
                <option value="">Category</option>
                {servicesList.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small">Item</label>
              <select
                className="form-select"
                value={it.item_id || ""}
                onChange={(e) =>
                  handleChange(idx, "item", {
                    id: e.target.value,
                    name: it.items.find((i) => i.item_id == e.target.value)?.item_name,
                  })
                }
                disabled={!it.items?.length}
              >
                <option value="">Item</option>
                {it.items?.map((i) => (
                  <option key={i.item_id} value={i.item_id}>
                    {i.item_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small">Type</label>
              <select
                className="form-select"
                value={it.type_id || ""}
                onChange={(e) =>
                  handleChange(idx, "type", {
                    id: e.target.value,
                    name: it.types.find((t) => t.type_id == e.target.value)?.type_name,
                  })
                }
                disabled={!it.types?.length}
              >
                <option value="">Type</option>
                {it.types?.map((t) => (
                  <option key={t.type_id} value={t.type_id}>
                    {t.type_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small">Description</label>
              <select
                className="form-select"
                value={it.description_id || ""}
                onChange={(e) =>
                  handleChange(idx, "description", {
                    id: e.target.value,
                    name: it.descriptions.find((d) => d.id == e.target.value)?.description_name,
                  })
                }
                disabled={!it.descriptions?.length}
              >
                <option value="">Description</option>
                {it.descriptions?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.description_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-end mt-2">
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeServiceRow(idx)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {errors.services && <div className="text-danger">{errors.services}</div>}
      <button type="button" className="btn btn-secondary mt-2" onClick={addServiceRow}>
        + Add Service
      </button>
    </div>
  );
}

export default UpdateServiceList;