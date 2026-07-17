import React, { useState, useEffect } from "react";
import { apiGet, BASE_URL } from "../api";
import "./css/RFQ.css";
import { useAdmin } from "../context/AdminContext";

function RFQ() {
  const { admin } = useAdmin();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [regions, setRegions] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [rfqTitle, setRfqTitle] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [description, setDescription] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showItems, setShowItems] = useState(false);
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState([
    {
      description: "",
      unitPrice: "",
      quantity: "",
      total: 0,
    },
  ]);

  const today = new Date().toISOString().split("T")[0];

  // ===============================
  // INITIAL LOAD
  // ===============================
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const cat = await apiGet("/api/admin/category/active");
      setCategories(Array.isArray(cat) ? cat : []);

      const regs = await apiGet("/api/admin/region/");
      setRegions(Array.isArray(regs) ? regs : []);
    } catch (error) {
      console.error("Initial Load Error:", error);
    }
  };

  // ===============================
  // REGION → STATE
  // ===============================
  const fetchStatesForRegion = async (regionId) => {
    if (!regionId) return setStates([]);

    try {
      const data = await apiGet(`/api/admin/state/by-region/${regionId}`);
      setStates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (selectedRegionId) {
      fetchStatesForRegion(selectedRegionId);
    } else {
      setStates([]);
    }

    setSelectedStateId("");
    setSelectedCityId("");
    setCities([]);
  }, [selectedRegionId]);

  // ===============================
  // STATE → CITY
  // ===============================
  const fetchCitiesForState = async (regionId, stateId) => {
    if (!regionId || !stateId) return setCities([]);

    try {
      const data = await apiGet(
        `/api/admin/city/by-region-state?region_id=${regionId}&state_id=${stateId}`
      );

      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (selectedRegionId && selectedStateId) {
      fetchCitiesForState(selectedRegionId, selectedStateId);
    } else {
      setCities([]);
    }

    setSelectedCityId("");
  }, [selectedStateId]);

  const handleFileChange = (e) => {
  const files = Array.from(e.target.files);

  const newFiles = files.map((file) => ({
        file,
        preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));

    setAttachments((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index) => {
      setAttachments((prev) =>
        prev.filter((_, i) => i !== index)
      );
    };

    // RFQ Items Functions
    const handleItemChange = (index, field, value) => {
      if ((field === "unitPrice" || field === "quantity") && Number(value) < 0 ) {
        return;
      }
      const updated = [...items];
      updated[index][field] = value;
      const unitPrice =
        parseFloat(updated[index].unitPrice) || 0;

      const quantity =
        parseFloat(updated[index].quantity) || 0;

      updated[index].total = unitPrice * quantity;
      setItems(updated);
    };

    const addItemRow = () => {
      setItems([
        ...items,
        {
          description: "",
          unitPrice: "",
          quantity: "",
          total: 0,
        },
      ]);
    };

    const removeItemRow = (index) => {
      setItems(
        items.filter((_, i) => i !== index)
      );
    };


  // ===============================
  // SUBMIT
  // ===============================
  const handleSubmit = async () => {
    try {

        const formData = new FormData();
        formData.append("ADMIN_ID",admin?.admin_id || "");
        formData.append("CATEGORY_ID", selectedCategory);
        formData.append("REGION_ID", selectedRegionId);
        formData.append("STATE_ID", selectedStateId);
        formData.append("CITY_ID", selectedCityId);
        formData.append("RFQ_TITLE", rfqTitle);
        formData.append("CLOSING_DATE", closingDate);
        formData.append("DESCRIPTION", description);
        formData.append("REMARKS", remarks);
        if (showItems) {
          formData.append("ITEMS", JSON.stringify(items));
        } else {
          formData.append("ITEMS", JSON.stringify([]));
        }
        formData.append("AMOUNT", amount);
        attachments.forEach((item) => {formData.append("attachments[]", item.file);});

        const res = await fetch(
        `${BASE_URL}/api/admin/workorders/rfq/create`,
        {
            method: "POST",
            body: formData,
            headers: {
            "ngrok-skip-browser-warning": "true",
            },
        }
        );

        const data = await res.json();

        console.log(data);

        if (!res.ok) {
        throw new Error(data.error || "RFQ Creation Failed");
        }

        alert("RFQ Created Successfully");
        window.location.reload();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
    };

  return (
    
    <div className="rfq-container">
        <div className="rfq-content">
      {/* Header */}
      <div className="rfq-page-header">
        <div>
          <h2>Create RFQ</h2>
        </div>
      </div>

      {/* Basic Information */}
<div className="rfq-card">

  {/* RFQ No / Closing Date / Title / Category */}
  <div className="rfq-grid">
    
     <div className="field">
      <label>RFQ Title</label>
      <input
        type="text"
        value={rfqTitle}
        placeholder="Enter RFQ Title"
        onChange={(e) =>
          setRfqTitle(e.target.value)
        }
      />
    </div>

    <div className="field">
      <label>Delivery Date</label>
      <input
        type="date"
        min={today}
        value={closingDate}
        onChange={(e) =>
          setClosingDate(e.target.value)
        }
      />
    </div>

   

    <div className="field">
      <label>Category</label>

      <select
        value={selectedCategory}
        onChange={(e) =>
          setSelectedCategory(e.target.value)
        }
      >
        <option value="">Select Category</option>

        {categories.map((category) => (
          <option
            key={category.category_id}
            value={category.category_id}
          >
            {category.category_name}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* Region / State / City */}
  <div className="location-grid">
    <div className="field">
      <label>Region</label>

      <select
        value={selectedRegionId}
        onChange={(e) =>
          setSelectedRegionId(e.target.value)
        }
      >
        <option value="">Select Region</option>

        {regions.map((r) => (
          <option
            key={r.region_id}
            value={r.region_id}
          >
            {r.region_name}
          </option>
        ))}
      </select>
    </div>

    <div className="field">
      <label>State</label>

      <select
        value={selectedStateId}
        onChange={(e) =>
          setSelectedStateId(e.target.value)
        }
        disabled={!selectedRegionId}
      >
        <option value="">Select State</option>

        {states.map((s) => (
          <option
            key={s.state_id}
            value={s.state_id}
          >
            {s.state_name}
          </option>
        ))}
      </select>
    </div>

    <div className="field">
      <label>City</label>

      <select
        value={selectedCityId}
        onChange={(e) =>
          setSelectedCityId(e.target.value)
        }
        disabled={!selectedStateId}
      >
        <option value="">Select City</option>

        {cities.map((c) => (
          <option
            key={c.city_id}
            value={c.city_id}
          >
            {c.city_name}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>

      {/* Project Details */}
      <div className="rfq-card">
        <h3>Project Details</h3>

        <div className="field">
          <label>Description</label>

          <textarea
            rows="5"
            value={description}
            placeholder="Enter project description"
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />
        </div>
          <div className="field">
            <label>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="Enter Amount"
              min="0"
            />
          </div>
      </div>
      
      {!showItems ? (
        <button
          type="button"
          className="create-btn"
          onClick={() => setShowItems(true)}
        >
          + Add RFQ Items
        </button>
      ) : (
        <button
          type="button"
          className="cancel-btn"
          onClick={() => {
            setShowItems(false);
            setItems([
              {
                description: "",
                unitPrice: "",
                quantity: "",
                total: 0,
              },
            ]);
          }}
        >
          Remove RFQ Items
        </button>
      )}

      {showItems && (
      <div className="rfq-card">
        <h3 style={{ marginBottom: "15px" }}>
          RFQ Items
        </h3>

        <div className="rfq-table-wrapper">
          <table className="rfq-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Item Description</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>

                  <td>
                    <input
                      type="text"
                      value={item.description}
                      placeholder="Item Description"
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      placeholder="0"
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "unitPrice",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      placeholder="0"
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "quantity",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td className="rfq-total-cell">
                    ₹{item.total}
                  </td>

                  <td>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeItemRow(index)
                        }
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Item Button */}
        <div className="rfq-item-actions">
          <button
            type="button"
            className="create-btn"
            onClick={addItemRow}
          >
            + Add Item
          </button>
        </div>

        {/* Grand Total */}
        <div className="rfq-grand-total">
          Grand Total : ₹
          {items.reduce(
            (sum, item) =>
              sum + Number(item.total || 0),
            0
          )}
        </div>
      </div>
      )}
      {/* Attachment */}
      <div className="rfq-card">
        <h3>Attachments</h3>

        <div className="upload-box">
        <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
        />
        </div>

        {attachments.length > 0 && (
        <div className="attachment-preview">
            {attachments.map((item, index) => (
            <div
                key={index}
                className="preview-card"
            >
                {item.preview ? (
                <img
                    src={item.preview}
                    alt="preview"
                    className="preview-image"
                />
                ) : (
                <div className="file-box">
                    📄 {item.file.name}
                </div>
                )}

                <button
                type="button"
                className="remove-file-btn"
                onClick={() => removeFile(index)}
                >
                ✕
                </button>
            </div>
            ))}
            
        </div>
        
        )}
      </div>
      <div className="rfq-footer-actions">
  <button
    type="button"
    className="cancel-btn"
  >
    Cancel
  </button>

  <button
    type="button"
    className="create-btn"
    onClick={handleSubmit}
  >
    Create RFQ
  </button>
</div>
      
    </div>
    
    </div>
  );
}

export default RFQ;