import React, { useState, useEffect } from "react";
import "./css/typepage.css";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api";

const TypePage = () => {
  const [formData, setFormData] = useState({
    TYPE_NAME: "",
    CATEGORY_ID: "",
    ITEM_ID: "",
    STATUS: "Active",
  });

  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [usageMap, setUsageMap] = useState({});

  const [editingId, setEditingId] = useState(null);
  // ✅ Filters for Existing Types Table
const [filters, setFilters] = useState({
  category: "",
  item: "",
  type: "",
  status: "",
});

  const [editingData, setEditingData] = useState({
    TYPE_NAME: "",
    CATEGORY_ID: "",
    ITEM_ID: "",
    STATUS: "",
  });

  const cleanInput = (value) => value.replace(/[^A-Za-z0-9\-()\/ ]/g, "");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const categoryData = await apiGet("/api/admin/category");
    const typeData = await apiGet("/api/admin/types");
    const itemData = await apiGet("/api/admin/items");

    setCategories(categoryData);
    setTypes(typeData);
    setAllItems(itemData);

    // ✅ NEW: usage check
    checkTypeUsage(typeData);
  };

  useEffect(() => {
    if (formData.CATEGORY_ID) loadFiltered(formData.CATEGORY_ID);
    else setFilteredItems([]);
  }, [formData.CATEGORY_ID]);

  const loadFiltered = async (categoryId) => {
    setFilteredItems(await apiGet(`/api/admin/items/${categoryId}`));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleaned =
      name === "TYPE_NAME"
        ? cleanInput(value)
        : ["CATEGORY_ID", "ITEM_ID"].includes(name)
        ? Number(value)
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: cleaned,
      ...(name === "CATEGORY_ID" ? { ITEM_ID: "" } : {}),
    }));
  };

  useEffect(() => {
    if (editingId && editingData.CATEGORY_ID)
      loadFiltered(editingData.CATEGORY_ID);
  }, [editingData.CATEGORY_ID]);
  const checkTypeUsage = async (typesData) => {
  try {
    const map = {};

    for (let row of typesData) {
      const res = await apiPost(
        "/api/admin/workorders/admin/type/usage-check",
        {
          category_id: row.category_id,
          item_id: row.item_id,
          type_id: row.type_id,
        }
      );

      map[`${row.category_id}_${row.item_id}_${row.type_id}`] =
        res?.data?.is_used;
    }

    setUsageMap(map);
  } catch (error) {
    console.error("Type usage check error:", error);
  }
};
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const cleaned =
      name === "TYPE_NAME"
        ? cleanInput(value)
        : ["CATEGORY_ID", "ITEM_ID"].includes(name)
        ? Number(value)
        : value;

    setEditingData((prev) => ({
      ...prev,
      [name]: cleaned,
      ...(name === "CATEGORY_ID" ? { ITEM_ID: "" } : {}),
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    await apiPost("/api/admin/types", {
      type_name: formData.TYPE_NAME,
      category_id: formData.CATEGORY_ID,
      item_id: formData.ITEM_ID,
      status: formData.STATUS,
    });

    setFormData({
      TYPE_NAME: "",
      CATEGORY_ID: "",
      ITEM_ID: "",
      STATUS: "Active",
    });

    setFilteredItems([]);
    loadData();

    alert("Type added successfully!");
  } catch (error) {
    console.error("Add type error:", error);

    alert(
      error?.response?.data?.message ||
      error?.message ||
      "Failed to add type"
    );
  }
};
  const handleEdit = async (row) => {
    setEditingId(row.id);
    setFilteredItems(await apiGet(`/api/admin/items/${row.category_id}`));

    setEditingData({
      TYPE_NAME: row.type_name,
      CATEGORY_ID: Number(row.category_id),
      ITEM_ID: Number(row.item_id),
      STATUS: row.status,
    });
  };
  
  const handleCancel = () => {
    setEditingId(null);
    setEditingData({
      TYPE_NAME: "",
      CATEGORY_ID: "",
      ITEM_ID: "",
      STATUS: "",
    });
    setFilteredItems([]);
  };

  const handleUpdate = async (id) => {
    await apiPut(`/api/admin/types/${id}`, {
      type_name: editingData.TYPE_NAME,
      category_id: editingData.CATEGORY_ID,
      item_id: editingData.ITEM_ID,
      status: editingData.STATUS,
    });
    alert("Type status updated");
    setEditingId(null);
    loadData();
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Delete?")) return;

    await apiDelete(`/api/admin/types/${row.id}`);
    loadData();
  };

  // ✅ Handle Filter Typing
const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters({ ...filters, [name]: value });
};

// ✅ Apply Filters to Types Table
const filteredTypes = types.filter((row) => {
  const cat = categories.find((c) => c.category_id === row.category_id);
  const it = allItems.find((i) => i.item_id === row.item_id);

  const categoryName = cat?.category_name || "";
  const itemName = it?.item_name || "";

  return (
    categoryName.toLowerCase().includes(filters.category.toLowerCase()) &&
    itemName.toLowerCase().includes(filters.item.toLowerCase()) &&
    row.type_name.toLowerCase().includes(filters.type.toLowerCase()) &&
    row.status.toLowerCase().includes(filters.status.toLowerCase())
  );
});

  // ✅ Find full name of selected item (tooltip)
  const selectedItemName =
    filteredItems.find((it) => it.item_id === Number(formData.ITEM_ID))
      ?.item_name || "";



  return (
    <div className="type-page">
      <div className="type-container">

        {/* FORM BOX */}
        <div className="type-box">
          <h2>Add New Type</h2>

          <form className="type-form" onSubmit={handleSubmit}>

            <div className="type-header-row">
              <div>WORK CATEGORY</div>
              <div>WORK ITEM</div>
            </div>

            <div className="type-input-row">

              <div className="star-wrapper">
                <select
                  name="CATEGORY_ID"
                  value={formData.CATEGORY_ID}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                <span className="star">★</span>
              </div>

              <div className="star-wrapper">
      <select
        name="ITEM_ID"
        value={formData.ITEM_ID}
        onChange={handleChange}
        title={selectedItemName}   // ✅ Hover shows full selected name
      >
        <option value="">Select Item</option>

        {filteredItems.map((it) => (
          <option
    key={it.id}
    value={it.item_id}

    // ✅ Hover shows full item name inside dropdown
    title={it.item_name}
  >
            {it.item_name.length > 60
              ? it.item_name.substring(0, 60) + "..."
              : it.item_name}
          </option>
        ))}
      </select>

         <span className="star">★</span>
              </div>

            </div>

            <div className="type-header-row">
              <div>WORK TYPE</div>
              <div>STATUS</div>
            </div>

            <div className="type-input-row">

              <div className="star-wrapper">
                <input
                  type="text"
                  name="TYPE_NAME"
                  value={formData.TYPE_NAME}
                  onChange={handleChange}
                  required
                />
                <span className="star">★</span>
              </div>

              <div className="star-wrapper">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="star">★</span>
              </div>

            </div>

            <div className="type-actions">
              <button className="type-btn-primary">Submit</button>
              <button
                type="button"
                className="type-btn-reset"
                onClick={() =>
                  setFormData({
                    TYPE_NAME: "",
                    CATEGORY_ID: "",
                    ITEM_ID: "",
                    STATUS: "Active",
                  })
                }
              >
                Reset
              </button>
            </div>

          </form>
        </div>

        {/* TABLE BOX */}
        <div className="type-box">
          <h2>Existing Types</h2>

          <div className="type-table-wrapper">
            <div className="fixed-table">
              <table className="type-table">
<thead>
  {/* ✅ Header Row */}
  <tr>
    <th>Work Category</th>
    <th>Work Item</th>
    <th>Work Type</th>
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
        className="type-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="item"
        placeholder="Filter item..."
        value={filters.item}
        onChange={handleFilterChange}
        className="type-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="type"
        placeholder="Filter type..."
        value={filters.type}
        onChange={handleFilterChange}
        className="type-filter-input"
      />
    </th>

    <th>
      <input
        type="text"
        name="status"
        placeholder="Filter status..."
        value={filters.status}
        onChange={handleFilterChange}
        className="type-filter-input"
      />
    </th>

    <th></th>
  </tr>
</thead>


                <tbody>
                  {filteredTypes.map((row) => {

                    const cat = categories.find(
                      (c) => c.category_id === row.category_id
                    );
                    const it = allItems.find(
                      (i) => i.item_id === row.item_id
                    );

                    if (editingId === row.id) {
                      return (
                        <tr key={row.id}>
                        <td>{cat?.category_name}</td>
                        <td>{it?.item_name}</td>

                            <td>{editingData.TYPE_NAME}</td>

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
                              className="type-btn-save"
                              onClick={() => handleUpdate(row.id)}
                            >
                              Save
                            </button>
                            <button
                              className="type-btn-cancel"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={row.id}>
                        <td>{cat?.category_name}</td>
                        <td>{it?.item_name}</td>
                        <td>{row.type_name}</td>
                        <td>{row.status}</td>

                        <td>
                          <button
                            className="type-btn-edit"
                            onClick={() => handleEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            className="type-btn-delete"
                            disabled={
                              usageMap[`${row.category_id}_${row.item_id}_${row.type_id}`] === true
                            }
                            onClick={() => handleDelete(row)}
                          >
                            Delete
                          </button>
                        </td>
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

export default TypePage;