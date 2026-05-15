import React, { useState, useEffect } from "react";
import "./css/mapping.css";

const MappingPage = () => {
  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState("");
  const [childs, setChilds] = useState([]);
  const [selectedChilds, setSelectedChilds] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/mapping/parents")
      .then((res) => res.json())
      .then((data) => setParents(data))
      .catch((err) => console.error("Error fetching parents:", err));
  }, []);

  const fetchChilds = async (parent) => {
    setSelectedParent(parent);
    try {
      const res = await fetch(`http://localhost:5000/api/mapping/childs/${parent}`);
      const data = await res.json();
      setChilds(data);
    } catch (error) {
      console.error("Error fetching childs:", error);
    }
  };

  const handleSelectChild = (wo) => {
    setSelectedChilds((prev) =>
      prev.includes(wo) ? prev.filter((c) => c !== wo) : [...prev, wo]
    );
  };

  const handleSubmit = async () => {
    if (!selectedParent || selectedChilds.length === 0) {
      alert("⚠️ Please select a parent and at least one child workorder.");
      return;
    }

    const payload = {
      parent_workorder: selectedParent,
      child_workorders: selectedChilds,
    };

    try {
      const res = await fetch("http://localhost:5000/api/mapping/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      alert(data.message || "Mapping saved successfully!");
      setSelectedChilds([]);
      fetchChilds(selectedParent);
    } catch (error) {
      console.error("Error saving mapping:", error);
    }
  };

  return (
    <div className="mapping-page-wrapper">
      <div className="mapping-page">
        <div className="mapping-container">
          <h2>Parent–Child Workorder Mapping</h2>

          {/* Parent Selection Section */}
          <div
            className="parent-card"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "20px",
              gap: "10px", // space between label & select
            }}
          >
            <label style={{ fontWeight: 600 }}>Select Parent Workorder:</label>
            <select
              onChange={(e) => fetchChilds(e.target.value)}
              value={selectedParent}
              style={{ minWidth: "200px" }}
            >
              <option value="">-- Select Parent Workorder --</option>
              {parents.map((p, i) => (
                <option key={i} value={p.WORKORDER}>
                  {p.WORKORDER}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          {selectedParent && <div className="section-divider"></div>}

          {/* Child Workorders Section */}
          {selectedParent && (
            <div className="child-section">
              <h3>Available Child Workorders</h3>

              {childs.length === 0 ? (
                <p className="no-data">No available child workorders to map.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="child-table">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Work Order</th>
                        <th>Type</th>
                        <th>Area</th>
                        <th>Status</th>
                        <th>Requested Time Closing</th>
                        <th>Remarks</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childs.map((c, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedChilds.includes(c.WORKORDER)}
                              onChange={() => handleSelectChild(c.WORKORDER)}
                            />
                          </td>
                          <td>{c.WORKORDER}</td>
                          <td>{c.WORKORDER_TYPE}</td>
                          <td>{c.WORKORDER_AREA}</td>
                          <td>{c.STATUS}</td>
                          <td>
                            {c.REQUESTED_TIME_CLOSING
                              ? new Date(c.REQUESTED_TIME_CLOSING).toLocaleString()
                              : "N/A"}
                          </td>
                          <td>{c.REMARKS || "—"}</td>
                          <td>
                            {c.RATE?.total_rate ?? "N/A"}
                            {c.RATE?.type_rates
                              ? ` (${Object.entries(c.RATE.type_rates)
                                  .map(([type, rate]) => `${type}: ${rate}`)
                                  .join(", ")})`
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button onClick={handleSubmit} className="btn-primary">
                Map Selected
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MappingPage;