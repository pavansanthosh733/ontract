import React, { useState, useEffect } from "react";
import "./css/setuppage.css";
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
  const [editingData, setEditingData] = useState({
    ITEM_NAME: "",
    CATEGORY_ID: "",
    STATUS: "",
  });

  const cleanInput = (value) => value.replace(/[^A-Za-z0-9- ]/g, "");

  const fetchCategories = async () => {
    const data = await apiGet("/api/category");
    setCategories(Array.isArray(data) ? data : []);
  };

  const fetchItems = async () => {
    const data = await apiGet("/api/items");
    setItems(Array.isArray(data) ? data : []);
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

    await apiPost("/api/items", {
      item_name: formData.ITEM_NAME,
      category_id: formData.CATEGORY_ID, // FIXED
      status: formData.STATUS,
    });

    setFormData({ ITEM_NAME: "", CATEGORY_ID: "", STATUS: "Active" });
    fetchItems();
    alert("Item added successfully!");
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
      category_id: editingData.CATEGORY_ID, // FIXED
      status: editingData.STATUS,
    });

    setEditingId(null);
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    await apiDelete(`/api/items/${id}`);
    fetchItems();
  };

  return (
    <div className="setup-page">
      <div className="page-container">

        <div className="box-section form-box">
          <h2>Add New Item</h2>

          <form onSubmit={handleSubmit} className="form-create">
            <div className="form-header-row">
              <div className="form-header-cell">CATEGORY</div>
              <div className="form-header-cell">ITEM NAME</div>
              <div className="form-header-cell">STATUS</div>
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

                  {/* FIXED — use category_id instead of id */}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}

                </select>
                <span className="required-star">★</span>
              </div>

              <div className="input-with-star">
                <input
                  type="text"
                  name="ITEM_NAME"
                  value={formData.ITEM_NAME}
                  onChange={handleChange}
                  placeholder="Enter Item Name"
                  required
                />
                <span className="required-star">★</span>
              </div>

              <div className="input-with-star">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="required-star">★</span>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Submit</button>
              <button
                type="button"
                className="btn-reset"
                onClick={() =>
                  setFormData({ ITEM_NAME: "", CATEGORY_ID: "", STATUS: "Active" })
                }
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* TABLE */}
        <div className="box-section table-box">
          <h2>Existing Items</h2>

          <table className="workorder-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const cat = categories.find(
                  c => c.category_id === item.category_id  // FIXED
                );

                return (
                  <tr key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <td>
                          <select
                            name="CATEGORY_ID"
                            value={editingData.CATEGORY_ID}
                            onChange={handleEditChange}
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.category_id}>
                                {cat.category_name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            type="text"
                            name="ITEM_NAME"
                            value={editingData.ITEM_NAME}
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
                          <button className="btn-save" onClick={() => handleUpdate(item.id)}>Save</button>
                          <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{cat?.category_name}</td>
                        <td>{item.item_name}</td>
                        <td>{item.status}</td>

                        <td>
                          <button className="btn-edit" onClick={() => handleEdit(item)}>Edit</button>
                          <button className="btn-delete" onClick={() => handleDelete(item.id)}>Delete</button>
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
  );
};

export default ItemPage;
