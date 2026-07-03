import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "../api";
import * as XLSX from "xlsx";
import "./css/contractorreport.css";

const ContractorReport = () => {
  const [contractors, setContractors] = useState([]);
  const [contractorId, setContractorId] = useState("");
  const [contractorQuery, setContractorQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const contractorBoxRef = useRef(null);

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const res = await apiGet("/api/contractors");
      const list = Array.isArray(res.data) ? res.data : [];
      setContractors(list);
      console.log("✅ Contractors loaded:", list.length);
    } catch (err) {
      console.error("❌ Failed to load contractors:", err);
      alert("Failed to load contractors");
    }
  };

  const filteredContractors = useMemo(() => {
    const q = contractorQuery.trim().toLowerCase();

    if (!q) return contractors;

    return contractors.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      const email = String(c.email_id || "").toLowerCase();
      const uid = String(c.user_uid || "").toLowerCase();
      return name.includes(q) || email.includes(q) || uid.includes(q);
    });
  }, [contractors, contractorQuery]);

  const handleContractorFocus = () => {
    console.log("📂 Contractor dropdown opened");
    setShowDropdown(true);
  };

  const cleanInput = (value) => value.replace(/[^A-Za-z0-9@._\-&() ]/g, "");
  const handleContractorChange = (e) => {
    const value = cleanInput(e.target.value);
    setContractorQuery(value);
    setContractorId("");
    setShowDropdown(true);

    console.log("⌨️ Contractor typing:", value);
    console.log("🔎 Filtered count:", contractors.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      const email = String(c.email_id || "").toLowerCase();
      const uid = String(c.user_uid || "").toLowerCase();
      const q = value.trim().toLowerCase();
      if (!q) return true;
      return name.includes(q) || email.includes(q) || uid.includes(q);
    }).length);
  };

  const handleSelectContractor = (c) => {
    setContractorId(c.user_uid);
    setContractorQuery(`${c.name || ""} (${c.email_id || ""})`);
    setShowDropdown(false);
    console.log("✅ Contractor selected:", c);
  };

  const handleWrapperBlur = (e) => {
    // Close only when focus leaves the whole contractor block
    if (contractorBoxRef.current && !contractorBoxRef.current.contains(e.relatedTarget)) {
      setTimeout(() => setShowDropdown(false), 100);
    }
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setStartDate(value);

    if (endDate && value && endDate < value) {
      setEndDate("");
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    setEndDate(value);
  };

  const handleSearch = async () => {
    if (!contractorId || !startDate || !endDate) {
      alert("Select contractor and date range");
      return;
    }

    if (endDate < startDate) {
      alert("End date must be greater than or equal to start date");
      return;
    }

    try {
      setLoading(true);

      const res = await apiPost("/api/contractor-report", {
        contractor_id: contractorId,
        start_date: startDate,
        end_date: endDate,
      });

      const rows = Array.isArray(res.data) ? res.data : [];
      setData(rows);
      console.log("✅ Report rows received:", rows.length);
    } catch (err) {
      console.error("❌ Report fetch failed:", err);
      alert(err?.response?.data?.message || err.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const total = data.reduce((sum, row) => {
    return sum + (parseFloat(row.service_rate) || 0);
  }, 0);

  const downloadExcel = () => {
    if (!data.length) {
      alert("No data");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contractor Report");
    XLSX.writeFile(wb, "contractor_report.xlsx");
  };

  return (
    <div className="contractor-report-container">
      <div className="report-header">
        <h2 className="title">Contractor Report</h2>
        <p className="subtitle">Search contractor-wise workorder report and export it to Excel.</p>
      </div>

      <div className="filters-card">
        <div className="filters-grid">
          <div
            className="field-group contractor-search-group"
            ref={contractorBoxRef}
            onBlur={handleWrapperBlur}
          >
            <label>Contractor</label>
            <div className="search-dropdown">
              <input
                type="text"
                value={contractorQuery}
                onFocus={handleContractorFocus}
                onChange={handleContractorChange}
                placeholder="Type contractor name / email / id"
                autoComplete="off"
              />

              {showDropdown && (
                <div className="dropdown-menu">
                  {filteredContractors.length > 0 ? (
                    filteredContractors.map((c) => (
                      <div
                        key={c.user_uid}
                        className="dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectContractor(c);
                        }}
                      >
                        <div className="dropdown-name">
                          {c.name || "Unnamed Contractor"}
                        </div>
                        <div className="dropdown-meta">
                          {c.email_id || c.user_uid}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-empty">No contractors found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="field-group">
            <label>From Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={handleStartDateChange}
              max={endDate || undefined}
            />
          </div>

          <div className="field-group">
            <label>To Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={handleEndDateChange}
              min={startDate || undefined}
            />
          </div>

          <div className="field-group button-group">
            <label className="button-label">Actions</label>
            <div className="action-buttons">
              <button className="btn primary" onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "🔍 Search"}
              </button>
              <button className="btn success" onClick={downloadExcel}>
                ⬇ Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Workorder</th>
                <th>Status</th>
                <th>Created</th>
                <th>Category</th>
                <th>Item</th>
                <th>Type</th>
                <th>Description</th>
                <th>Region</th>
                <th>State</th>
                <th>City</th>
                <th>Client</th>
                <th>Contractor</th>
                <th>Rate</th>
              </tr>
            </thead>

            <tbody>
              {data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.workorder}</td>
                    <td>{row.status}</td>
                    <td>{row.created_time}</td>
                    <td>{row.category_name}</td>
                    <td>{row.item_name}</td>
                    <td>{row.type_name}</td>
                    <td>{row.description_name}</td>
                    <td>{row.region_name}</td>
                    <td>{row.state_name}</td>
                    <td>{row.city_name}</td>
                    <td>{row.client}</td>
                    <td>{row.contractor_name}</td>
                    <td className="rate">₹{row.service_rate}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="empty-state">
                    No report data found
                  </td>
                </tr>
              )}

              {data.length > 0 && (
                <tr className="total-row">
                  <td colSpan="12">Total</td>
                  <td className="rate total">₹{total.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractorReport;