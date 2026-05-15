import React, { useState, useEffect } from "react";
import "./css/setuppage.css";
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
  const [allItems, setAllItems] = useState([]);    // 🔥 FULL item list for table

  const [filteredItems, setFilteredItems] = useState([]); // 🔥 Only filtered items for dropdown

  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    TYPE_NAME: "",
    CATEGORY_ID: "",
    ITEM_ID: "",
    STATUS: "",
  });

  const cleanInput = (v) => v.replace(/[^A-Za-z0-9-. ]/g, "");

  // Load everything once
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const ct = await apiGet("/api/category");
    setCategories(ct);

    const tt = await apiGet("/api/types");
    setTypes(tt);

    const it = await apiGet("/api/items"); // 🔥 Load ALL ITEMS once
    setAllItems(it);
  };

  // Load filtered items on category change (FORM)
  useEffect(() => {
    if (formData.CATEGORY_ID) {
      loadFilteredItems(formData.CATEGORY_ID);
    } else {
      setFilteredItems([]);
    }
  }, [formData.CATEGORY_ID]);

  const loadFilteredItems = async (categoryId) => {
    const data = await apiGet(`/api/items/${categoryId}`);
    setFilteredItems(data);
  };

  // Input handler
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

  // Load filtered items during edit
  useEffect(() => {
    if (editingId && editingData.CATEGORY_ID) {
      loadFilteredItems(editingData.CATEGORY_ID);
    }
  }, [editingData.CATEGORY_ID]);

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

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    await apiPost("/api/types", {
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
    loadInitialData();
    alert("Type added successfully!");
  };

  // Edit Type
  const handleEdit = async (row) => {
    setEditingId(row.id);

    const filtered = await apiGet(`/api/items/${row.category_id}`);
    setFilteredItems(filtered);

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

  // Update
  const handleUpdate = async (id) => {
    await apiPut(`/api/types/${id}`, {
      type_name: editingData.TYPE_NAME,
      category_id: editingData.CATEGORY_ID,
      item_id: editingData.ITEM_ID,
      status: editingData.STATUS,
    });

    setEditingId(null);
    setFilteredItems([]);
    loadInitialData();
  };

  // Delete type
  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    await apiDelete(`/api/types/${id}`);
    loadInitialData();
  };

  return (
    <div className="setup-page">
      <div className="page-container">
        {/* FORM SECTION */}
        <div className="box-section form-box">
          <h2>Add New Type</h2>

          <form className="form-create" onSubmit={handleSubmit}>
            <div className="form-header-row">
              <div className="form-header-cell">CATEGORY</div>
              <div className="form-header-cell">ITEM</div>
            </div>

            <div className="combined-body">
              <div className="input-with-star">
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
              </div>

              <div className="input-with-star">
                <select
                  name="ITEM_ID"
                  value={formData.ITEM_ID}
                  onChange={handleChange}
                  disabled={!formData.CATEGORY_ID}
                  required
                >
                  <option value="">Select Item</option>
                  {filteredItems.map((it) => (
                    <option key={it.id} value={it.item_id}>
                      {it.item_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-header-row">
              <div className="form-header-cell">TYPE NAME</div>
              <div className="form-header-cell">STATUS</div>
            </div>

            <div className="combined-body">
              <input
                type="text"
                name="TYPE_NAME"
                value={formData.TYPE_NAME}
                onChange={handleChange}
                required
              />

              <select
                name="STATUS"
                value={formData.STATUS}
                onChange={handleChange}
                required
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="form-actions">
              <button className="btn-primary">Submit</button>
              <button
                type="button"
                className="btn-reset"
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

        {/* TABLE SECTION */}
        <div className="box-section table-box">
          <h2>Existing Types</h2>

          <div className="table-wrapper">
            <table className="workorder-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {types.map((row) => {
                  const cat = categories.find(
                    (c) => c.category_id === row.category_id
                  );
                  const it = allItems.find(
                    (i) => i.item_id === row.item_id
                  ); // 🔥 Pull from full item list

                  return (
                    <tr key={row.id}>
                      {editingId === row.id ? (
                        <>
                          <td>
                            <select
                              name="CATEGORY_ID"
                              value={editingData.CATEGORY_ID}
                              onChange={handleEditChange}
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.category_id}>
                                  {c.category_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <select
                              name="ITEM_ID"
                              value={editingData.ITEM_ID}
                              onChange={handleEditChange}
                            >
                              {filteredItems.map((it) => (
                                <option key={it.id} value={it.item_id}>
                                  {it.item_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              type="text"
                              name="TYPE_NAME"
                              value={editingData.TYPE_NAME}
                              onChange={handleEditChange}
                            />
                          </td>

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
                              className="btn-save"
                              onClick={() => handleUpdate(row.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{cat?.category_name}</td>
                          <td>{it?.item_name}</td>
                          <td>{row.type_name}</td>
                          <td>{row.status}</td>

                          <td>
                            <button
                              className="btn-edit"
                              onClick={() => handleEdit(row)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDelete(row.id)}
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
  );
};

export default TypePage;