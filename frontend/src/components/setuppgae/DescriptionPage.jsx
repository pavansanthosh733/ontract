import React, { useEffect, useState } from "react";
import "./css/description.css";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api";

const DescriptionPage = () => {
  const [formData, setFormData] = useState({
    DESCRIPTION: "",
    CATEGORY_ID: "",
    ITEM_ID: "",
    TYPE_ID: "",
    STATUS: "Active",
  });

  const [descriptions, setDescriptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [itemsAll, setItemsAll] = useState([]);
  const [typesAll, setTypesAll] = useState([]);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [usageMap, setUsageMap] = useState({});
  const cleanInput = (value) => value.replace(/[^A-Za-z0-9.,\-&() ]/g, "");

  const [editingId, setEditingId] = useState(null);
  // ✅ Filters for Existing Descriptions Table
const [filters, setFilters] = useState({
  category: "",
  item: "",
  type: "",
  description: "",
  status: "",
});

  const [editingData, setEditingData] = useState({
    DESCRIPTION: "",
    CATEGORY_ID: "",
    ITEM_ID: "",
    TYPE_ID: "",
    STATUS: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const cat = await apiGet("/api/category");
    const desc = await apiGet("/api/description");
    const allItems = await apiGet("/api/items");
    const allTypes = await apiGet("/api/types");

    setCategories(cat || []);
    setDescriptions(desc || []);
    setItemsAll(allItems || []);
    setTypesAll(allTypes || []);
    checkDescriptionUsage(desc || []);
  };

  const fetchItemsForCategory = async (categoryId) => {
    if (!categoryId) return setItems([]);
    const data = await apiGet(`/api/items/${categoryId}`);
    setItems(data || []);
  };

  const fetchTypesForCategoryItem = async (categoryId, itemId) => {
    if (!categoryId || !itemId) return setTypes([]);
    const data = await apiGet(
      `/api/types/filter?category_id=${categoryId}&item_id=${itemId}`
    );
    setTypes(data || []);
  };

  useEffect(() => {
    formData.CATEGORY_ID
      ? fetchItemsForCategory(formData.CATEGORY_ID)
      : setItems([]);
  }, [formData.CATEGORY_ID]);

  useEffect(() => {
    formData.CATEGORY_ID && formData.ITEM_ID
      ? fetchTypesForCategoryItem(formData.CATEGORY_ID, formData.ITEM_ID)
      : setTypes([]);
  }, [formData.ITEM_ID, formData.CATEGORY_ID]);

  useEffect(() => {
    if (editingId && editingData.CATEGORY_ID)
      fetchItemsForCategory(editingData.CATEGORY_ID);
  }, [editingData.CATEGORY_ID, editingId]);

  useEffect(() => {
    if (editingId && editingData.CATEGORY_ID && editingData.ITEM_ID)
      fetchTypesForCategoryItem(
        editingData.CATEGORY_ID,
        editingData.ITEM_ID
      );
  }, [editingData.ITEM_ID, editingData.CATEGORY_ID, editingId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleaned = name === "DESCRIPTION" ? cleanInput(value) : value;

    setFormData((prev) => {
      let updated = { ...prev, [name]: cleaned };
      if (name === "CATEGORY_ID") updated.ITEM_ID = updated.TYPE_ID = "";
      if (name === "ITEM_ID") updated.TYPE_ID = "";
      return updated;
    });
  };
  
  const checkDescriptionUsage = async (descData) => {
    try {
      const promises = descData.map((row) =>
        apiPost("/api/workorders/admin/description/usage-check", {
          category_id: row.category_id,
          item_id: row.item_id,
          type_id: row.type_id,
          description_id: row.description_id,
        }).then((res) => ({
          key: `${row.category_id}_${row.item_id}_${row.type_id}_${row.description_id}`,
          value: res?.data?.is_used ?? true, // safe default
        }))
      );

      const results = await Promise.all(promises);

      const map = {};
      results.forEach((r) => {
        map[r.key] = r.value;
      });

      setUsageMap(map);
    } catch (error) {
      console.error("Description usage check error:", error);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditingData((prev) => {
      let updated = { ...prev, [name]: value };
      if (name === "CATEGORY_ID") updated.ITEM_ID = updated.TYPE_ID = "";
      if (name === "ITEM_ID") updated.TYPE_ID = "";
      return updated;
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      description: formData.DESCRIPTION,
      category_id: formData.CATEGORY_ID,
      item_id: formData.ITEM_ID,
      type_id: formData.TYPE_ID,
      status: formData.STATUS,
    };

    await apiPost("/api/description", payload);

    setFormData({
      DESCRIPTION: "",
      CATEGORY_ID: "",
      ITEM_ID: "",
      TYPE_ID: "",
      STATUS: "Active",
    });

    setItems([]);
    setTypes([]);
    await loadData();
    alert("Description added successfully!");
  } catch (error) {
    console.error("Add description error:", error);

    alert(
      error?.response?.data?.message ||
      error?.message ||
      "Failed to add description"
    );
  }
};



  const handleEdit = async (row) => {
    setEditingId(row.id);

    await fetchItemsForCategory(row.category_id);
    await fetchTypesForCategoryItem(row.category_id, row.item_id);

    setEditingData({
      DESCRIPTION: row.description_name,
      CATEGORY_ID: row.category_id,
      ITEM_ID: row.item_id,
      TYPE_ID: row.type_id,
      STATUS: row.status,
    });
  };

  const handleUpdate = async (id) => {
    const payload = {
      description: editingData.DESCRIPTION,
      category_id: editingData.CATEGORY_ID,
      item_id: editingData.ITEM_ID,
      type_id: editingData.TYPE_ID,
      status: editingData.STATUS,
    };

    await apiPut(`/api/description/${id}`, payload);
    setEditingId(null);
    setItems([]);
    setTypes([]);
    alert("description status updated!");
    await loadData();
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Delete this description?")) return;
    await apiDelete(`/api/description/${row.id}`);
    await loadData();
  };

  // ✅ Handle Filter Typing
const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters({ ...filters, [name]: value });
};

// ✅ Apply Filters to Descriptions Table
const filteredDescriptions = descriptions.filter((row) => {
  const cat = categories.find((c) => c.category_id === row.category_id);
  const item = itemsAll.find((i) => i.item_id === row.item_id);
  const type = typesAll.find((t) => t.type_id === row.type_id);

  const categoryName = cat?.category_name || "";
  const itemName = item?.item_name || "";
  const typeName = type?.type_name || "";
  const descName = row.description_name || "";

  return (
    categoryName.toLowerCase().includes(filters.category.toLowerCase()) &&
    itemName.toLowerCase().includes(filters.item.toLowerCase()) &&
    typeName.toLowerCase().includes(filters.type.toLowerCase()) &&
    descName.toLowerCase().includes(filters.description.toLowerCase()) &&
    row.status.toLowerCase().includes(filters.status.toLowerCase())
  );
});

// ✅ Full selected Item Name Tooltip
const selectedItemName =
  items.find((it) => it.item_id === Number(formData.ITEM_ID))
    ?.item_name || "";

// ✅ Full selected Type Name Tooltip
const selectedTypeName =
  types.find((t) => t.type_id === Number(formData.TYPE_ID))
    ?.type_name || "";



  return (
    <div className="description-page">
      <div className="description-container">

        {/* =============== FORM BOX =============== */}
        <div className="desc-box">
          <h2>Add Description</h2>

          {/* ⭐ FORM WRAPPER ADDED */}
          <form className="form-create" onSubmit={handleSubmit}>

            {/* HEADER ROW 1 */}
            <div className="desc-header-row">
              <div className="desc-header-cell">WORK CATEGORY</div>
              <div className="desc-header-cell">WORK ITEM</div>
              <div className="desc-header-cell">WORK TYPE</div>
            </div>

            <div className="desc-row three">
              <div className="desc-input-wrapper">
                <select
                  name="CATEGORY_ID"
                  value={formData.CATEGORY_ID}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Work Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                <span className="desc-star">★</span>
              </div>

      <div className="desc-input-wrapper">
  <select
    name="ITEM_ID"
    value={formData.ITEM_ID}
    onChange={handleChange}
    disabled={!formData.CATEGORY_ID}
    required
    title={selectedItemName}   // ✅ Hover shows full item name
  >
    <option value="">Select Work Item</option>

    {items.map((it) => (
  <option
    key={it.id}
    value={it.item_id}

    // ✅ Hover shows full item name inside dropdown
    title={it.item_name}
  >
        {it.item_name.length > 35
          ? it.item_name.substring(0, 35) + "..."
          : it.item_name}
      </option>
    ))}
  </select>

  <span className="desc-star">★</span>
</div>

<div className="desc-input-wrapper">
  <select
    name="TYPE_ID"
    value={formData.TYPE_ID}
    onChange={handleChange}
    disabled={!formData.ITEM_ID}
    required
    title={selectedTypeName}   // ✅ Hover shows full type name
  >
    <option value="">Select Work Type</option>

    {types.map((t) => (
  <option
    key={t.id}
    value={t.type_id}

    // ✅ Hover shows full type name inside dropdown
    title={t.type_name}
  >
        {t.type_name.length > 35
          ? t.type_name.substring(0, 35) + "..."
          : t.type_name}
      </option>
    ))}
  </select>

  <span className="desc-star">★</span>
</div>

            </div>

            {/* HEADER ROW 2 */}
            <div className="desc-header-row two-col">
              <div className="desc-header-cell"> Work DESCRIPTION</div>
              <div className="desc-header-cell"> STATUS</div>
            </div>

            <div className="desc-row two">
              <div className="desc-input-wrapper">
                <textarea
                  name="DESCRIPTION"
                  value={formData.DESCRIPTION}
                  onChange={handleChange}
                  required
                  placeholder="Enter description"
                />
                <span className="desc-star">★</span>
              </div>

              <div className="desc-input-wrapper">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="desc-star">★</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="desc-actions">
              <button type="submit" className="desc-btn-primary">
                Submit
              </button>

              <button
                type="button"
                className="desc-btn-reset"
                onClick={() =>
                  setFormData({
                    DESCRIPTION: "",
                    CATEGORY_ID: "",
                    ITEM_ID: "",
                    TYPE_ID: "",
                    STATUS: "Active",
                  })
                }
              >
                Reset
              </button>
            </div>

          </form>
        </div>

        {/* =============== TABLE BOX =============== */}
        <div className="type-box">
          <h2>Existing Descriptions</h2>

          <div className="type-table-wrapper">
            <div className="fixed-table">
            <table className="desc-table">
<thead>
  {/* ✅ Header Row */}
  <tr>
    <th>Work Category</th>
    <th>Work Item</th>
    <th>Work Type</th>
    <th>Work Description</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>

  {/* ✅ Filter Row */}
  <tr>
    <th>
      <input
        type="text"
        name="category"
        placeholder="Filter category..."
        value={filters.category}
        onChange={handleFilterChange}
        className="desc-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="item"
        placeholder="Filter item..."
        value={filters.item}
        onChange={handleFilterChange}
        className="desc-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="type"
        placeholder="Filter type..."
        value={filters.type}
        onChange={handleFilterChange}
        className="desc-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="description"
        placeholder="Filter description..."
        value={filters.description}
        onChange={handleFilterChange}
        className="desc-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="status"
        placeholder="Filter status..."
        value={filters.status}
        onChange={handleFilterChange}
        className="desc-filter-input"
      />
    </th>

    <th></th>
  </tr>
</thead>


              <tbody>
               {filteredDescriptions.map((row) => {

                  const cat = categories.find(
                    (c) => c.category_id === row.category_id
                  );
                  const item = itemsAll.find(
                    (i) => i.item_id === row.item_id
                  );
                  const type = typesAll.find(
                    (t) => t.type_id === row.type_id
                  );

                  return (
                    <tr key={row.id}>
                      {editingId === row.id ? (
                        <>
                              <td>{cat?.category_name}</td>
    <td>{item?.item_name}</td>
    <td>{type?.type_name}</td>                            
    <td>{editingData.DESCRIPTION}</td>
                          <td>
                            <select
                              name="STATUS"
                              value={editingData.STATUS}
                              onChange={handleEditChange}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </td>

                          <td>
                            <button
                              className="desc-btn-save"
                              onClick={() => handleUpdate(row.id)}
                            >
                              Save
                            </button>

                            <button
                              className="desc-btn-cancel"
                              onClick={() => {
                                setEditingId(null);
                                setItems([]);
                                setTypes([]);
                              }}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{cat?.category_name}</td>
                          <td>{item?.item_name}</td>
                          <td>{type?.type_name}</td>
                          <td>{row.description_name}</td>
                          <td>{row.status}</td>

                          <td>
                            <button
                              className="desc-btn-edit"
                              onClick={() => handleEdit(row)}
                            >
                              Edit
                            </button>
                            <button
                              className="desc-btn-delete"
                              disabled={
                                usageMap[
                                  `${row.category_id}_${row.item_id}_${row.type_id}_${row.description_id}`
                                ] === true
                              }
                              onClick={() => handleDelete(row)}
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default DescriptionPage;