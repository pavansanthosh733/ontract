import React, { useEffect, useState } from "react";
import { apiGet } from "../../../api";

function ServiceRow({ row, index, regions, categories, onChange, onRemove, errors }) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [descriptions, setDescriptions] = useState([]);

  /* ===== ID RECOVERY: fill in missing ids from names ===== */

  // region_id from region name
  useEffect(() => {
    if (row.region_id || !row.region || !regions.length) return;
    const found = regions.find(r => r.region_name === row.region);
    if (found) onChange(index, { region_id: found.region_id });
  }, [row.region, row.region_id, regions]);

  // category_id from category_name
  useEffect(() => {
    if (row.category_id || !row.category_name || !categories.length) return;
    const found = categories.find(c => c.category_name === row.category_name);
    if (found) onChange(index, { category_id: found.category_id });
  }, [row.category_name, row.category_id, categories]);

  /* Region -> States, then recover state_id from state name */
  useEffect(() => {
    if (!row.region_id) { setStates([]); return; }
    let active = true;
    apiGet(`/api/contractor/state/by-region/${row.region_id}`)
      .then((data) => {
        if (!active) return;
        const list = data || [];
        setStates(list);
        if (!row.state_id && row.state) {
          const found = list.find(s => s.state_name === row.state);
          if (found) onChange(index, { state_id: found.state_id });
        }
      })
      .catch(() => active && setStates([]));
    return () => { active = false; };
  }, [row.region_id]);

  /* Region + State -> Cities, then recover city_id from city name */
  useEffect(() => {
    if (!row.region_id || !row.state_id) { setCities([]); return; }
    let active = true;
    apiGet(`/api/contractor/city/by-region-state?region_id=${row.region_id}&state_id=${row.state_id}`)
      .then((data) => {
        if (!active) return;
        const list = data || [];
        setCities(list);
        if (!row.city_id && row.city) {
          const found = list.find(c => c.city_name === row.city);
          if (found) onChange(index, { city_id: found.city_id });
        }
      })
      .catch(() => active && setCities([]));
    return () => { active = false; };
  }, [row.region_id, row.state_id]);

  /* Category -> Items, then recover item_id from item_name */
  useEffect(() => {
    if (!row.category_id) { setItems([]); return; }
    let active = true;
    apiGet(`/api/contractor/items/${row.category_id}`)
      .then((data) => {
        if (!active) return;
        const list = data || [];
        setItems(list);
        if (!row.item_id && row.item_name) {
          const found = list.find(i => i.item_name === row.item_name);
          if (found) onChange(index, { item_id: found.item_id });
        }
      })
      .catch(() => active && setItems([]));
    return () => { active = false; };
  }, [row.category_id]);

  /* Category + Item -> Types, then recover type_id from type_name */
  useEffect(() => {
    if (!row.category_id || !row.item_id) { setTypes([]); return; }
    let active = true;
    apiGet(`/api/contractor/types/filter?category_id=${row.category_id}&item_id=${row.item_id}`)
      .then((data) => {
        if (!active) return;
        const list = data || [];
        setTypes(list);
        if (!row.type_id && row.type_name) {
          const found = list.find(t => t.type_name === row.type_name);
          if (found) onChange(index, { type_id: found.type_id });
        }
      })
      .catch(() => active && setTypes([]));
    return () => { active = false; };
  }, [row.category_id, row.item_id]);

  /* Category + Item + Type -> Descriptions, then recover description_id */
  useEffect(() => {
    if (!row.category_id || !row.item_id || !row.type_id) { setDescriptions([]); return; }
    let active = true;
    apiGet(
      `/api/contractor/description/filter?category_id=${row.category_id}&item_id=${row.item_id}&type_id=${row.type_id}`
    )
      .then((data) => {
        if (!active) return;
        const list = data || [];
        setDescriptions(list);
        if (!row.description_id && row.description_name) {
          const found = list.find(d => d.description_name === row.description_name);
          if (found) onChange(index, { description_id: found.description_id || found.id });
        }
      })
      .catch(() => active && setDescriptions([]));
    return () => { active = false; };
  }, [row.category_id, row.item_id, row.type_id]);

  /* ===== Handlers: unchanged from your version ===== */

  const handleRegionChange = (e) => {
    const name = e.target.value;
    const found = regions.find((r) => r.region_name === name);
    onChange(index, {
      region: name,
      region_id: found?.region_id || null,
      state: "", state_id: null,
      city: "", city_id: null,
    });
  };

  const handleStateChange = (e) => {
    const name = e.target.value;
    const found = states.find((s) => s.state_name === name);
    onChange(index, {
      state: name,
      state_id: found?.state_id || null,
      city: "", city_id: null,
    });
  };

  const handleCityChange = (e) => {
    const name = e.target.value;
    const found = cities.find((c) => c.city_name === name);
    onChange(index, { city: name, city_id: found?.city_id || null });
  };

  const handleCategoryChange = (e) => {
    const id = e.target.value;
    const found = categories.find((c) => c.category_id == id);
    onChange(index, {
      category_id: id,
      category_name: found?.category_name || "",
      item_id: "", item_name: "",
      type_id: "", type_name: "",
      description_id: "", description_name: "",
    });
  };

  const handleItemChange = (e) => {
    const id = e.target.value;
    const found = items.find((i) => i.item_id == id);
    onChange(index, {
      item_id: id,
      item_name: found?.item_name || "",
      type_id: "", type_name: "",
      description_id: "", description_name: "",
    });
  };

  const handleTypeChange = (e) => {
    const id = e.target.value;
    const found = types.find((t) => t.type_id == id);
    onChange(index, {
      type_id: id,
      type_name: found?.type_name || "",
      description_id: "", description_name: "",
    });
  };

  const handleDescriptionChange = (e) => {
    const name = e.target.value;
    const found = descriptions.find((d) => d.description_name === name);
    onChange(index, {
      description_name: name,
      description_id: found?.description_id || found?.id || null,
    });
  };

  const handlePriceChange = (e) => onChange(index, { price: e.target.value });

  return (
    <div className="border rounded p-3 mb-3">
      {/* ===== ROW 1 : LOCATION ===== */}
      <div className="row mb-2 align-items-end">
        <div className="col-md-3">
          <select
            className={`form-select ${errors[`region-${index}`] ? "is-invalid" : ""}`}
            value={row.region || ""}
            onChange={handleRegionChange}
          >
            <option value="">Region</option>
            {regions.map((r) => (
              <option key={r.region_id} value={r.region_name}>{r.region_name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className={`form-select ${errors[`state-${index}`] ? "is-invalid" : ""}`}
            value={row.state || ""}
            onChange={handleStateChange}
            disabled={!row.region}
          >
            <option value="">State</option>
            {states.map((s) => (
              <option key={s.state_id} value={s.state_name}>{s.state_name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={row.city || ""}
            onChange={handleCityChange}
            disabled={!row.state_id}
          >
            <option value="">City</option>
            {cities.map((c) => (
              <option key={c.city_id} value={c.city_name}>{c.city_name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <input
            type="number"
            className={`form-control ${errors[`price-${index}`] ? "is-invalid" : ""}`}
            placeholder="Price"
            value={row.price}
            onChange={handlePriceChange}
          />
        </div>

        <div className="col-md-1">
          <button type="button" className="btn btn-danger w-100" onClick={() => onRemove(index)}>×</button>
        </div>
      </div>

      {/* ===== ROW 2 : CLASSIFICATION ===== */}
      <div className="row">
        <div className="col-md-3">
          <select className="form-select" value={row.category_id || ""} onChange={handleCategoryChange}>
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={row.item_id || ""}
            onChange={handleItemChange}
            disabled={!items.length}
          >
            <option value="">Item</option>
            {items.map((i) => (
              <option key={i.item_id} value={i.item_id}>{i.item_name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={row.type_id || ""}
            onChange={handleTypeChange}
            disabled={!types.length}
          >
            <option value="">Type</option>
            {types.map((t) => (
              <option key={t.type_id} value={t.type_id}>{t.type_name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={row.description_name || ""}
            onChange={handleDescriptionChange}
            disabled={!descriptions.length}
          >
            <option value="">Description</option>
            {descriptions.map((d) => (
              <option key={d.id || d.description_id} value={d.description_name}>{d.description_name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default ServiceRow;