import React from "react";
import ServiceRow from "./ServiceRow";

function ServiceList({ locationServiceList, regions, categories, onChangeRow, onAddRow, onRemoveRow, errors }) {
  return (
    <div className="col-12">
      <h5>Services by Location (Malaysia) <span className="required-asterisk">*</span></h5>

      {locationServiceList.map((row, idx) => (
        <ServiceRow
          key={idx}
          row={row}
          index={idx}
          regions={regions}
          categories={categories}
          onChange={onChangeRow}
          onRemove={onRemoveRow}
          errors={errors}
        />
      ))}

      {errors.services && <div className="text-danger">{errors.services}</div>}

      <button type="button" className="btn btn-secondary mt-2" onClick={onAddRow}>
        + Add Service
      </button>
    </div>
  );
}

export default ServiceList;