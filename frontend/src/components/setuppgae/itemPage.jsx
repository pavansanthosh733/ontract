import React, { useState, useEffect } from "react";
import "./css/itempage.css";   // ⬅️ New CSS file
import { apiGet, apiPost, apiPut, apiDelete } from "../../api";

const ItemPage = () => {
  const [formData, setFormData] = useState({
    ITEM_NAME: "",
    CATEGORY_ID: "",
    STATUS: "Active",
  });

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);

  // ✅ NEW: usage map
  const [usageMap, setUsageMap] = useState({});

  // ✅ Filters for table search
  const [filters, setFilters] = useState({
    category: "",
    item: "",
    status: "",
  });

  const [editingData, setEditingData] = useState({
    ITEM_NAME: "",
    CATEGORY_ID: "",
    STATUS: "",
  });

  const cleanInput = (value) => value.replace(/[^A-Za-z0-9- ]/g, "");

  const fetchCategories = async () => {
    const data = await apiGet("/api/category/active");
    setCategories(Array.isArray(data) ? data : []);
  };

  // ✅ NEW: usage check function
  const checkItemUsage = async (itemsData) => {
    try {
      const map = {};

      for (let item of itemsData) {
        const res = await apiPost(
          "/api/workorders/admin/item/usage-check",
          {
            category_id: item.category_id,
            item_id: item.item_id,
          }
        );

        map[`${item.category_id}_${item.item_id}`] = res?.data?.is_used;
      }

      setUsageMap(map);
    } catch (error) {
      console.error("Item usage check error:", error);
    }
  };

  const fetchItems = async () => {
    const data = await apiGet("/api/items");
    const itemList = Array.isArray(data) ? data : [];

    setItems(itemList);

    // ✅ call usage check
    checkItemUsage(itemList);
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean = name === "ITEM_NAME" ? cleanInput(value) : value;
    setFormData((prev) => ({ ...prev, [name]: clean }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const clean = name === "ITEM_NAME" ? cleanInput(value) : value;
    setEditingData((prev) => ({ ...prev, [name]: clean }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    await apiPost("/api/items", {
      item_name: formData.ITEM_NAME,
      category_id: formData.CATEGORY_ID,
      status: formData.STATUS,
    });

    setFormData({
      ITEM_NAME: "",
      CATEGORY_ID: "",
      STATUS: "Active",
    });

    fetchItems();

    alert("Item added successfully!");

  } catch (error) {
    console.error("Add item error:", error);

    alert(
      error?.response?.data?.message ||
      error?.message ||
      "Failed to add item"
    );
  }
};

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditingData({
      ITEM_NAME: item.item_name,
      CATEGORY_ID: item.category_id,
      STATUS: item.status,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({ ITEM_NAME: "", CATEGORY_ID: "", STATUS: "" });
  };

  const handleUpdate = async (id) => {
    await apiPut(`/api/items/${id}`, {
      item_name: editingData.ITEM_NAME,
      category_id: editingData.CATEGORY_ID,
      status: editingData.STATUS,
    });

    setEditingId(null);
    alert("item page updated!");
    fetchItems();
  };

  // ✅ UPDATED DELETE (NO usage check here)
  const handleDelete = async (item) => {
    if (!window.confirm("Delete this item?")) return;

    await apiDelete(`/api/items/${item.id}`);
    fetchItems();
  };

  // ✅ Handle filter typing
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  // ✅ Apply Filters to Items
  const filteredItems = items.filter((item) => {
    const cat = categories.find(
      (c) => c.category_id === item.category_id
    );

    const categoryName = cat?.category_name || "";

    return (
      categoryName.toLowerCase().includes(filters.category.toLowerCase()) &&
      item.item_name.toLowerCase().includes(filters.item.toLowerCase()) &&
      item.status.toLowerCase().includes(filters.status.toLowerCase())
    );
  });

  return (
    <div className="item-page">
      <div className="item-container">

        {/* ================= FORM BOX ================= */}
        <div className="item-box">
          <h2>Add New Item</h2>

          <form className="item-form" onSubmit={handleSubmit}>

            <div className="item-header-row">
              <div>WORK CATEGORY</div>
              <div>WORK ITEM </div>
              <div>STATUS</div>
            </div>

            <div className="item-input-row">

              <div className="item-input-wrapper">
                <select
                  name="CATEGORY_ID"
                  value={formData.CATEGORY_ID}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
                <span className="item-star">★</span>
              </div>

              <div className="item-input-wrapper">
                <input
                  type="text"
                  name="ITEM_NAME"
                  value={formData.ITEM_NAME}
                  onChange={handleChange}
                  placeholder="Enter Item Name"
                  required
                />
                <span className="item-star">★</span>
              </div>

              <div className="item-input-wrapper">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="item-star">★</span>
              </div>

            </div>

            <div className="item-actions">
              <button className="item-btn-primary" type="submit">Submit</button>
              <button
                className="item-btn-reset"
                type="button"
                onClick={() =>
                  setFormData({ ITEM_NAME: "", CATEGORY_ID: "", STATUS: "Active" })
                }
              >
                Reset
              </button>
            </div>

          </form>
        </div>

        {/* ================= TABLE BOX ================= */}
        <div className="type-box">
          <h2>Existing Items</h2>

          <div className="type-table-wrapper">
            <div className="fixed-table">
              <table className="item-table">
                <thead>
                  <tr>
                    <th>Work Category</th>
                    <th>Work Item</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>

                  <tr>
                    <th>
                      <input
                        type="text"
                        name="category"
                        placeholder="Filter category..."
                        value={filters.category}
                        onChange={handleFilterChange}
                        className="item-filter-input"
                      />
                    </th>

                    <th>
                      <input
                        type="text"
                        name="item"
                        placeholder="Filter item..."
                        value={filters.item}
                        onChange={handleFilterChange}
                        className="item-filter-input"
                      />
                    </th>

                    <th>
                      <input
                        type="text"
                        name="status"
                        placeholder="Filter status..."
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="item-filter-input"
                      />
                    </th>

                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => {

                    const cat = categories.find(
                      (c) => c.category_id === item.category_id
                    );

                    return (
                      <tr key={item.id}>
                        {editingId === item.id ? (
                          <>
                            <td>{cat?.category_name}</td>
                            <td>{editingData.ITEM_NAME}</td>

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
                              <button className="item-btn-save" onClick={() => handleUpdate(item.id)}>Save</button>
                              <button className="item-btn-cancel" onClick={handleCancel}>Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{cat?.category_name}</td>
                            <td>{item.item_name}</td>
                            <td>{item.status}</td>

                            <td>
                              <button className="item-btn-edit" onClick={() => handleEdit(item)}>Edit</button>

                              {/* ✅ DELETE DISABLED */}
                              <button
                                className="item-btn-delete"
                                disabled={usageMap[`${item.category_id}_${item.item_id}`] === true}
                                onClick={() => handleDelete(item)}
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

export default ItemPage;