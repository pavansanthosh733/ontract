import React, { useState } from "react";
import { apiPost } from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./css/WorkorderReport.css";

const WorkorderReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState([]);

  const handleSearch = async () => {
    try {
      const res = await apiPost("/api/workorder-report", {
        start_date: startDate,
        end_date: endDate,
      });
      setData(res.data || []);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const totalPrice = data.reduce((sum, row) => {
    return sum + (parseFloat(row.price_rm) || 0);
  }, 0);

  const downloadExcel = () => {
    if (!data.length) {
      alert("No data to download");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Workorder Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(fileData, "workorder_report.xlsx");
  };

return (
  <div className="workorder-report-container">
    <h2 className="title">Workorder Report</h2>

    {/* 🔍 Filters */}
    <div className="filters-card">
      {/* Top Row */}
      <div className="filters-top">
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

      {/* Bottom Row */}
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
        <table className="report-table">
          <thead>
            <tr>
              <th>Workorder</th>
              <th>Status</th>
              <th>Created Time</th>
              <th>Category</th>
              <th>Item</th>
              <th>Type</th>
              <th>Description</th>
              <th>Region</th>
              <th>State</th>
              <th>City</th>
              <th>Client</th>
              <th>Contractor</th>
              <th>Price</th>
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
                <td className="price">₹{row.price_rm}</td>
              </tr>
            ))}

            {data.length > 0 && (
              <tr className="total-row">
                <td colSpan="12">Total</td>
                <td className="price total">₹{totalPrice}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
};

export default WorkorderReport;