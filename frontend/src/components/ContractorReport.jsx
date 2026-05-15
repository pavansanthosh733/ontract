import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import * as XLSX from "xlsx";
import "./css/contractorreport.css";

const ContractorReport = () => {
  const [contractors, setContractors] = useState([]);
  const [contractorId, setContractorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState([]);

  // 🔹 Load contractors
  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const res = await apiGet("/api/contractors");
      setContractors(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load contractors");
    }
  };

  // 🔹 Fetch report
  const handleSearch = async () => {
    if (!contractorId || !startDate || !endDate) {
      alert("Select contractor and date range");
      return;
    }

    try {
      const res = await apiPost("/api/contractor-report", {
        contractor_id: contractorId,
        start_date: startDate,
        end_date: endDate,
      });

      setData(res.data || []);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // 🔹 Total bill
  const total = data.reduce((sum, row) => {
    return sum + (parseFloat(row.service_rate) || 0);
  }, 0);

  // 🔹 Excel download
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
    <h2 className="title">Contractor Report</h2>

<div className="filters-card">
  {/* 🔹 Top Row */}
  <div className="filters-top">
    <select
      value={contractorId}
      onChange={(e) => setContractorId(e.target.value)}
    >
      <option value="">Select Contractor</option>
      {contractors.map((c) => (
        <option key={c.user_uid} value={c.user_uid}>
          {c.name} ({c.email_id})
        </option>
      ))}
    </select>

    <input
      type="datetime-local"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
    />

    <input
      type="datetime-local"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
    />
  </div>

  {/* 🔹 Bottom Row (Buttons) */}
  <div className="filters-bottom">
    <button className="btn primary" onClick={handleSearch}>
      🔍 Search
    </button>

    <button className="btn success" onClick={downloadExcel}>
      ⬇ Download
    </button>
  </div>
</div>

    {/* 📊 Table */}
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
            {data.map((row, i) => (
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
            ))}

            {data.length > 0 && (
              <tr className="total-row">
                <td colSpan="12">Total</td>
                <td className="rate total">₹{total}</td>
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